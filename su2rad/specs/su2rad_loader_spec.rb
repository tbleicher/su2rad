require 'rspec'

$:.push(File.dirname(__FILE__))
$:.push(".")

require 'sketchup.rb'
require 'su2rad_loader.rb'

describe Su2rad do
    
    it "is a defined module" do
        expect(Su2rad)
        expect(Su2rad::VERSION)
        expect(Su2rad::CREATOR)
        expect(Su2rad::COPYRIGHT)
    end
end
