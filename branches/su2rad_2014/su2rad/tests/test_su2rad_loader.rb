require 'test/unit'

$:.push(File.dirname(__FILE__))
require 'sketchup.rb'
require 'su2rad_loader.rb'

class Su2radModuleTest < Test::Unit::TestCase
    def test_module_exists
        assert_not_nul(Su2rad)
    end
end


