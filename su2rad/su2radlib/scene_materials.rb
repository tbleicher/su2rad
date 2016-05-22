
require 'radiance.rb'
require 'exportbase.rb'

require 'modules/jsonutils.rb'
require 'modules/logger.rb'
require 'modules/session.rb'

module Tbleicher

  module Su2Rad

    class ListMaterial
      
      include Tbleicher::Su2Rad::JSONUtils
      include RadianceUtils
     
      attr_reader :name, :alias
      attr_writer :alias
      
      def initialize(material, group='undef')
        @material = material
        @name = material.name
        @alias = ''
        @group = group
      end
      
      def getDict
        dict = {
          'name'     => '%s' % @material.name,
          'nameRad'  => '%s' % getRadianceIdentifier(@material.name),
          'nameHTML' => '%s' % escapeHTML(@material.name),
          'alias'    => '%s' % @alias,
          'group'    => '%s' % @group
        }
        return dict
      end
      
      def setAlias(newAlias)
        @alias = newAlias
      end
      
      def toJSON
        return toStringJSON(getDict())
      end  

    end # ListMaterial


    class SkmMaterial < ListMaterial
    
      def getDict
        d = super()
        d['radName'] = getRadianceIdentifier(@material.display_name)
        return d
      end

    end # SkmMaterial


    class RadMaterial < ListMaterial
    
      def getDict
        d = super()
        d['group']      = @material.getGroup()
        d['defType']    = @material.defType
        d['definition'] = @material.getText().gsub(/\n/, '<br/>')
        d['required']   = @material.required
        d['mType']      = @material.getType()
        return d
      end
    
    end # RadMaterial

  end # Su2Rad

end # Tbleicher
