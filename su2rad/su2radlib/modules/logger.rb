module SU2RAD

    module Logger

        Logger::LOG = []
        Logger::LOGLEVEL = 0

        def initLog(lines=[])
            SU2RAD::Logger::LOG.clear()
            SU2RAD::Logger::LOG.concat(lines)
        end
        
        def getNestingLevel
            return 0
        end
        
        def uimessage(msg, loglevel=0, sketchup_module=Sketchup, counter=nil)
            begin
                prefix = "  " * getNestingLevel()
                levels = ["I", "V", "D", "3", "4", "5", "E", "W"]  ## [0,1,2,3,4,5,-2,-1]
                line = "%s[%s] %s" % [prefix, levels[loglevel], msg]
                if loglevel <= SU2RAD::Logger::LOGLEVEL
                    sketchup_module.set_status_text(line.strip())
                    msg.split("\n").each { |l|  printf "%s[%s] %s\n" % [prefix,levels[loglevel],l] }
                    SU2RAD::Logger::LOG.push(line)
                end
                if counter && loglevel == -2
                    counter.add('errors')
                elsif counter && loglevel == -1
                    counter.add('warnings')
                end
            rescue => e
                printf "## %s" % $!.message
                printf "## %s" % e.backtrace.join("\n## ")
                printf "\n[uimessage rescue] #{msg}\n"
            end
        end
        
        def writeLogFile(filename, status="", sketchup_module=Sketchup)

            SU2RAD::Logger::LOG.push( "###  finished: %s  ###" % Time.new() )
            SU2RAD::Logger::LOG.push( "###  %s  ###" % status )

            if not createFile(filename, SU2RAD::Logger::LOG.join("\n"))
                uimessage("Error: Could not create log file '#{filename}'", -2, sketchup_module)
                line = "### creating log file failed: %s  ###" % Time.new()
                printf "%s\n" % line
                sketchup_module.set_status_text(line)
            else
                printf "%s\n" % line
            end
        end
    end

end