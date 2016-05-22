require "exportbase.rb"

module Tbleicher

  module Su2Rad

    class RadianceGroup < ExportBase
       
      def initialize(entity, state)
        @state = state
        @entity = entity
        uimessage("group: '%s'" % entity.name, 1)
      end
         
      def export(parenttrans)
        push()
        entities = @entity.entities
        name = getUniqueName(@entity.name)
        resetglobal = checkTransformation()
        parenttrans = setTransformation(parenttrans, resetglobal)
        
        @@nameContext.push(name)
        @@materialContext.push(getMaterial(@entity))
        
        oldglobal = $globaltrans
        $globaltrans *= @entity.transformation
        ref = exportByGroup(entities, parenttrans)
        $globaltrans = oldglobal
        
        @@materialContext.pop()
        @@nameContext.pop()
        
        if resetglobal == true
          setConfig('MAKEGLOBAL', false)
        end
        pop()
        return ref
      end
        
    end # RadianceGroup

  end # Su2Rad

end # Tbleicher

