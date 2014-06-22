require 'minitest/autorun'


$:.push(File.dirname(__FILE__))
$:.push(".")
require 'sketchup.rb'
require 'su2rad_loader.rb'

class Su2radModuleTest < MiniTest::Test
    def test_module_exists
        assert(Su2rad)
    end

    def test_VERSION_exists
        assert(Su2rad::VERSION)
    end

    def test_CREATOR_exists
        assert(Su2rad::CREATOR)
    end

    def test_COPYRIGHT_exists
        assert(Su2rad::COPYRIGHT)
    end
end

