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

    describe "::addRadianceMenu" do
        before(:each) do
            @subsub = double("subsub")
            allow(@subsub).to receive(:add_item)
            allow(@subsub).to receive(:add_separator)
            allow(@subsub).to receive(:add_submenu)
            @submenu = double("submenu")
            allow(@submenu).to receive(:add_separator)
            allow(@submenu).to receive(:add_submenu).and_return(@subsub)
            menu = double("menu")
            allow(menu).to receive(:add_submenu).and_return(@submenu)
            expect(UI).to receive(:menu) { menu }
        end
        context "with debug not set" do
            before do
                Su2rad.debug = false
            end
            it "creates basic menu entries" do
                expect(@submenu).to receive(:add_item).with("export").once
                expect(@submenu).to receive(:add_item).with(/About/).once
                expect(@submenu).to receive(:add_item).with("Acknowledgement").once
                expect(@submenu).to receive(:add_separator).twice
                expect(@submenu).to receive(:add_submenu).with("Import").once
                Su2rad::addRadianceMenu()
            end
        end
        context "with debug set" do
            before do
                Su2rad.debug = true
            end
            it "creates basic and debug menu entries" do
                expect(@submenu).to receive(:add_item).exactly(4).times
                expect(@submenu).to receive(:add_separator).exactly(3).times
                Su2rad::addRadianceMenu()
            end
        end
    end

    

end
