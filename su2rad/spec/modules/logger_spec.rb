require_relative '../../su2radlib/modules/logger.rb'

class LogUser
  include SU2RAD::Logger
end

class LogUserB
  include SU2RAD::Logger
end

$createFileReturnValue = true
def createFile(filename, text)
  return $createFileReturnValue
end

describe SU2RAD::Logger do

  before(:each) do
    @foo = LogUser.new()
    @sketchup = double("Sketchup")
    SU2RAD::Logger::LOG.clear()
  end


  it "is defined within the SU2RAD module" do
    expect(SU2RAD::Logger).to be_truthy
  end

  it "has a constant LOG defined" do
    expect(SU2RAD::Logger::LOG).to be_truthy
  end

  it "is shared among all users" do
    allow(@sketchup).to receive(:set_status_text)
    expect(SU2RAD::Logger::LOG.length).to be(0)
    @foo.uimessage('message from a', 0, @sketchup)
    expect(SU2RAD::Logger::LOG.length).to be(1)
    b = LogUserB.new()
    b.uimessage('message from b', 0, @sketchup)
    expect(SU2RAD::Logger::LOG.length).to be(2)
  end


  describe '#initLog' do 

    it "resets SU2RAD::Logger::LOG" do
      allow(@sketchup).to receive(:set_status_text)
      @foo.uimessage("a message", 0, @sketchup)
      expect(SU2RAD::Logger::LOG.length).to be(1)
      @foo.initLog()
      expect(SU2RAD::Logger::LOG.length).to be(0)
    end

    it "sets initial lines of SU2RAD::Logger::LOG" do
      arr = ['line 1','line 2']
      @foo.initLog(arr)
      expect(SU2RAD::Logger::LOG.length).to be(2)
      expect(SU2RAD::Logger::LOG).to eq(arr)
    end

  end # #initLog


  describe '#uimessage' do

    it "adds info indicator to messages" do
      allow(@sketchup).to receive(:set_status_text).with("[I] log message")
      @foo.uimessage('log message', 0, @sketchup)
    end

    it "adds warning indicator to messages" do
      allow(@sketchup).to receive(:set_status_text).with("[W] log message")
      @foo.uimessage('log message', -1, @sketchup)
    end

    it "adds error indicator to messages" do
      allow(@sketchup).to receive(:set_status_text).with("[E] log message")
      @foo.uimessage('log message', -2, @sketchup)
    end

    it "adds warning messages to the counter" do
      allow(@sketchup).to receive(:set_status_text).with("[W] log message")
      counter = double("SU2RAD::Counter")
      allow(counter).to receive(:add).with("warnings")
      @foo.uimessage('log message', -1, @sketchup, counter)
    end

    it "adds error messages to the counter" do
      allow(@sketchup).to receive(:set_status_text).with("[E] log message")
      counter = double("SU2RAD::Counter")
      allow(counter).to receive(:add).with("errors")
      @foo.uimessage('log message', -2, @sketchup, counter)
    end

    it "adds messages to SU2RAD::Logger::LOG" do
      allow(@sketchup).to receive(:set_status_text)
      expect(SU2RAD::Logger::LOG.length).to be(0)
      @foo.uimessage('log message', 0, @sketchup)
      expect(SU2RAD::Logger::LOG.length).to be(1)
    end

  end # #uimessage


  describe '#writeLogFile' do
    it "adds final lines before closing" do
      allow(@sketchup).to receive(:set_status_text)
      @foo.uimessage('log message', 0, @sketchup)
      expect(SU2RAD::Logger::LOG.length).to be(1)
      @foo.writeLogFile("/path/to/logfile.log", "status", @sketchup)
      expect(SU2RAD::Logger::LOG.length).to be(3)
      lines = SU2RAD::Logger::LOG[1..2]
      expect(lines[0]).to start_with("###")
      expect(lines[1]).to start_with("###")
    end

    it "writes a log file" do
      allow(@sketchup).to receive(:set_status_text)
      @foo.uimessage('log message', 0, @sketchup)
      expect(SU2RAD::Logger::LOG.length).to be(1)
      @foo.writeLogFile("/path/to/logfile.log", "status", @sketchup)
    end

    it "may fail writing a log file" do
      $createFileReturnValue = false
      allow(@sketchup).to receive(:set_status_text).with(/failed/)
      allow(@sketchup).to receive(:set_status_text).with(/logfile\.log/)
      @foo.writeLogFile("/path/to/logfile.log", "status", @sketchup)
    end
  
  end # #writeLogFile

end