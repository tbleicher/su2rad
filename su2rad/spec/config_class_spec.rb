# config_class_spec.rb_
 
require_relative '../su2radlib/config_class'

describe RunTimeConfig do
  
  it "creates a new instance on Win" do
    config = RunTimeConfig.new()
    expect(config).to be_instance_of(RunTimeConfig)
  end

   it "creates a new instance on Mac" do
    config = RunTimeConfig.new()
    expect(config).to be_instance_of(RunTimeConfig)
  end
  
end
