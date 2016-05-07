
module InterfaceBase
   
    def getConfig(key)
        return $SU2RAD_CONFIG.get(key)
    end
    
    def getNestingLevel
        return 0
    end
    
    def setConfig(key,value)
        $SU2RAD_CONFIG.set(key, value)
    end
    
end





