require "exportbase.rb"

module Tbleicher

  module Su2Rad

    class RadianceComponent < ExportBase

      attr_reader :replacement, :iesdata, :lampMF, :lampType
      
      def initialize(entity, state)
        @state = state
        @entity = entity
        uimessage("RadComponent: '%s' [def='%s']" % [entity.name, entity.definition.name])
        @replacement = ''
        @iesdata = ''
        @lampMF = 0.8
        @lampType = 'default'
        if getConfig('REPLMARKS') != ''
          searchReplFile()
        end
      end
                
      def copyDataFile(transformation)
        ## copy existing .dat file to './luminaires' directory
        cpath = @entity.path
        if cpath == nil or cpath == false
          return
        end
        datapath = cpath.sub(/\.skp\z/i, '.dat')
        if FileTest.exists?(datapath)
          uimessage("distribution data file '#{datapath}' found", 1)
        else
          return
        end
        datafilename = getFilename("luminaires/#{defname}.dat")
        if $createdFiles[datafilename] != 1
          f = File.new(@iesdata)
          datatext = f.read()
          f.close()
          if createFile(datafilename, datatext) != true
            uimessage("Error creating data file '#{datafilename}'", -2)
            return false
          end
        end
      end
        
      def setLampMF(mf=0.8)
        #TODO: get setting from property
        @lampMF = mf
      end
      
      def setLampType(ltype='default')
        #TODO: check option?
        @lampType = ltype
      end
      
      def copyIESLuminaire(transformation)
        ies2rad = "!ies2rad -s -m %f -t %s" % [@lampMF, @lampType]
        ## add filename options
        defname = getComponentName(@entity)
        ies2rad = ies2rad + " -o luminaires/#{defname} luminaires/#{defname}.ies"
        
        ## copy IES file if it's not in 'luminaires/'
        iesfilename = getFilename("luminaires/#{defname}.ies")
        if $createdFiles[iesfilename] != 1
          f = File.new(@iesdata)
          iestext = f.read()
          f.close()
          if createFile(iesfilename, iestext) != true
            return "## error creating IES file '#{iesfilename}'\n"
          end
        end

        ## combine ies2rad and transformation 
        xform = getXform(iesfilename, transformation)
        xform.sub!("!xform", "| xform")
        xform.sub!(iesfilename, "")
        return ies2rad + " " + xform + "\n"
      end
        
      def copyReplFile(filename, transformation)
        #XXX
        suffix = @replacement[@replacement.length-4,4]
        defname = getComponentName(@entity)
        filename = getFilename("objects/#{defname}#{suffix}")
        
        f = File.new(@replacement)
        radtext = f.read()
        f.close()
        
        if $createdFiles[filename] != 1 and createFile(filename, radtext) != true
          msg = "Error creating replacement file '#{filename}'"
          uimessage(msg, -2)
          return "\n## #{msg}\n"
        else
          ref = getXform(filename, transformation)
        end
        cpdata = copyDataFile(transformation)
        if cpdata == false
          msg = "Error: could not copy data file for '#{filename}'"
          uimessage(msg, -2)
          return "\n## #{msg}\n"
        else
          return "\n" + ref
        end
      end
        
      def searchReplFile
        cpath = @entity.definition.path
        if cpath == nil or cpath == false
          return
        end
        if FileTest.exists?(cpath.sub(/\.skp\z/i, '.ies'))
          @iesdata = cpath.sub(/\.skp\z/i, '.ies')
          uimessage("ies data file '#{@iesdata}' found", 1)
        end
        if FileTest.exists?(cpath.sub(/\.skp\z/i, '.oct'))
          @replacement = cpath.sub(/\.skp\z/i, '.oct')
          uimessage("replacement file '#{@replacement}' found", 1)
        elsif FileTest.exists?(cpath.sub(/\.skp\z/i, '.rad'))
          @replacement = cpath.sub(/\.skp\z/i, '.rad')
          uimessage("replacement file '#{@replacement}' found", 1)
        end
      end
       
      def export(parenttrans)
        push()
        entities = @entity.definition.entities
        defname = getComponentName(@entity)
        iname = getUniqueName(@entity.name)
        
        mat = getMaterial(@entity)
        matname = getMaterialName(mat)
        alias_name = "%s_material" % defname
        @@materialContext.setAlias(mat, alias_name)
        @@materialContext.push(alias_name)
          
        ## force export to global coords if transformation
        ## can't be reproduced with xform
        resetglobal = checkTransformation()
        
        skip_export = false
        if makeGlobal?() == false
          filename = getFilename("objects/#{defname}.rad")
          if $createdFiles[filename] == 1
            skip_export = true
            uimessage("file 'objects/#{defname}.rad' exists -> skipping export")
            uimessage("creating new ref for instance '#{iname}'")
          end
          @@nameContext.push(defname)  ## use definition name for file
        else
          filename = getFilename("objects/#{iname}.rad")
          @@nameContext.push(iname)    ## use instance name for file
        end
        
        parenttrans = setTransformation(parenttrans, resetglobal)
        if @iesdata != ''
          ## luminaire from IES data
          ref = copyIESLuminaire(parenttrans)
        elsif @replacement != ''
          ## any other replacement file
          ref = copyReplFile(filename, parenttrans)
        elsif skip_export == true 
          ref = getXform(filename, @entity.transformation)
        else
          oldglobal = $globaltrans
          $globaltrans *= @entity.transformation
          $inComponent.push(true)
          ref = exportByGroup(entities, parenttrans, false)
          $inComponent.pop()
          $globaltrans = oldglobal
        end
            
        @@materialContext.pop()
        @@nameContext.pop()
        pop()

        if resetglobal == true
          setConfig('MAKEGLOBAL', false)
        end
        if @replacement != '' or @iesdata != ''
          ## no alias for replacement files
          ## add to scene level components list
          @@components.push(ref)
          return ref
        else
          ref = ref.sub(defname, iname)
          return "\nvoid alias %s %s\n%s" % [alias_name, matname, ref]
        end
      end
        
      def getComponentName(e)
        ## find name for component instance
        d = e.definition
        if @@componentNames.has_key?(d)
          return @@componentNames[d]
        elsif d.name != '' and d.name != nil
          name = remove_spaces(d.name)
          @@componentNames[d] = name
          return name
        else
          name = getUniqueName('component')
          @@componentNames[d] = name
          return name
        end
      end

    end # RadianceComponent

  end # Su2Rad

end # Tbleicher
