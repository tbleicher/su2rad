require_relative '../su2radlib/modules/logger.rb'

class LogUser
	include SU2RAD::Logger
end


describe SU2RAD::Logger do

  it "is defined within the SU2RAD module" do
  	expect(SU2RAD::Logger).to be_truthy
  end

  it "has a constant LOG defined" do
  	expect(SU2RAD::Logger::LOG).to be_truthy
  end

  it "can be used as mixin" do
  	Sketchup = double("Sketchup")
  	allow(Sketchup).to receive(:set_status_text)
  	foo = LogUser.new()
  	foo.uimessage('log message')
  end

  it "adds level indicators to messages" do
  	Sketchup = double("Sketchup")
  	allow(Sketchup).to receive(:set_status_text).with("[I] log message")
  	foo = LogUser.new()
  	foo.uimessage('log message')
  end


end
