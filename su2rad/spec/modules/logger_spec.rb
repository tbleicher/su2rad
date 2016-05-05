require_relative '../../su2radlib/modules/logger.rb'

require 'stringio'

def capture_stdout(&blk)
  old = $stdout
  $stdout = fake = StringIO.new
  blk.call
  fake.string
ensure
  $stdout = old
end

class LogUser
  include Su2Rad::Logger
end

class LogUserB
  include Su2Rad::Logger
end

$createFileReturnValue = true
def createFile(filename, text)
  return $createFileReturnValue
end

describe Su2Rad::Logger do

  before(:each) do
    @foo = LogUser.new()
    @sketchup = double("Sketchup")
    Su2Rad::Logger.clear()
  end


  it "is defined within the Su2Rad module" do
    expect(Su2Rad::Logger).to be_truthy
  end

  it "is shared among all users" do
    allow(@sketchup).to receive(:set_status_text)
    b = LogUserB.new()
    expect(Su2Rad::Logger.output.length).to be(0)
    printed = capture_stdout do
      @foo.uimessage('message from a', 0, @sketchup)
      #expect(Su2Rad::Logger.ou  tput.length).to be(1)
      b.uimessage('message from b', 0, @sketchup)
    end
    expect(Su2Rad::Logger.output.length).to be(2)
  end


  describe '#initLog' do 

    it "resets Su2Rad::Logger::LOG" do
      allow(@sketchup).to receive(:set_status_text)
      printed = capture_stdout do
        @foo.uimessage("a message", 0, @sketchup)
      end
      expect(Su2Rad::Logger.output.length).to be(1)
      Su2Rad::Logger.initLog()
      expect(Su2Rad::Logger.output.length).to be(0)
    end

    it "sets initial lines of Su2Rad::Logger::LOG" do
      arr = ['line 1','line 2']
      Su2Rad::Logger.initLog(arr)
      expect(Su2Rad::Logger.output.length).to be(2)
      expect(Su2Rad::Logger.output).to eq(arr)
    end

  end # #initLog


  describe '#uimessage' do

    it "adds info indicator to messages" do
      allow(@sketchup).to receive(:set_status_text).with("[I] log message")
      printed = capture_stdout do
        @foo.uimessage('log message', 0, @sketchup)
      end
    end

    it "adds warning indicator to messages" do
      allow(@sketchup).to receive(:set_status_text).with("[W] log message")
      printed = capture_stdout do
        @foo.uimessage('log message', -1, @sketchup)
      end
    end

    it "adds error indicator to messages" do
      allow(@sketchup).to receive(:set_status_text).with("[E] log message")
      printed = capture_stdout do
        @foo.uimessage('log message', -2, @sketchup)
      end
    end

    it "adds warning messages to the counter" do
      allow(@sketchup).to receive(:set_status_text).with("[W] log message")
      counter = double("Su2Rad::Counter")
      allow(counter).to receive(:add).with("warnings")
      printed = capture_stdout do
        @foo.uimessage('log message', -1, @sketchup, counter)
      end
    end

    it "adds error messages to the counter" do
      allow(@sketchup).to receive(:set_status_text).with("[E] log message")
      counter = double("Su2Rad::Counter")
      allow(counter).to receive(:add).with("errors")
      printed = capture_stdout do
        @foo.uimessage('log message', -2, @sketchup, counter)
      end
    end

    it "adds messages to Su2Rad::Logger::LOG" do
      allow(@sketchup).to receive(:set_status_text)
      expect(Su2Rad::Logger.output.length).to be(0)
      printed = capture_stdout do
        @foo.uimessage('log message', 0, @sketchup)
      end
      expect(Su2Rad::Logger.output.length).to be(1)
    end

  end # #uimessage


  describe '#closeLog' do
    it "adds final lines to output" do
      allow(@sketchup).to receive(:set_status_text)
      printed = capture_stdout do
        @foo.uimessage('log message', 0, @sketchup)
      end
      expect(Su2Rad::Logger.output.length).to be(1)
      Su2Rad::Logger.closeLog()
      expect(Su2Rad::Logger.output.length).to be(3)
      lines = Su2Rad::Logger.output[1..2]
      expect(lines[0]).to start_with("###")
      expect(lines[1]).to start_with("###")
    end
  end


  describe '#write' do
    it "writes a log file" do
      path = "/path/to/logfile.log"
      io = "" 
      allow(File).to receive(:open).with(path, "a").and_return(io)
      allow(@sketchup).to receive(:set_status_text)
      printed = capture_stdout do
        @foo.uimessage('final message', 0, @sketchup)
      end
      expect(Su2Rad::Logger.output.length).to be(1)
      Su2Rad::Logger.write("/path/to/logfile.log")
      expect( io ).to eq("[I] final message")
    end

    it "may fail writing a log file" do
      path = "/path/to/logfile.log"
      allow(File).to receive(:open).with(path, "a").and_raise("boom")
      allow(@sketchup).to receive(:set_status_text).with(/failed/)
      allow(@sketchup).to receive(:set_status_text).with(/logfile\.log/)
      printed = capture_stdout do  
        Su2Rad::Logger.write(path, @sketchup)
      end
    end
  
  end # #writeLogFile

end