require_relative '../../su2radlib/modules/jsonutils.rb'

describe SU2RAD::JSONUtils do
  
  it "is defined within the SU2RAD module" do
  	expect(SU2RAD::JSONUtils).to be_truthy
  end
  
end
