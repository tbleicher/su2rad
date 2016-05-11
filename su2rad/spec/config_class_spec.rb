# config_class_spec.rb
 
require_relative '../su2radlib/config_class.rb'

describe Tbleicher::Su2Rad::RunTimeConfig do
  
  it "creates a new instance" do
    config = Tbleicher::Su2Rad::RunTimeConfig.new()
    expect(config).to be_instance_of(Tbleicher::Su2Rad::RunTimeConfig)
  end

   it "creates a new instance" do
    config = Tbleicher::Su2Rad::RunTimeConfig.new()
    expect(config).to be_instance_of(Tbleicher::Su2Rad::RunTimeConfig)
  end
  
end
