module SU2RAD


    module Logger

        Logger::LOG = []
        Logger::LOGLEVEL = 0

        def initLog(lines=[])
            self.class.const_set(SU2RAD::Logger::LOG, lines)
        end
        
        def getNestingLevel
            return 0
        end
        
        def uimessage(msg, loglevel=0)
            begin
                prefix = "  " * getNestingLevel()
                levels = ["I", "V", "D", "3", "4", "5", "E", "W"]  ## [0,1,2,3,4,5,-2,-1]
                line = "%s[%s] %s" % [prefix, levels[loglevel], msg]
                if loglevel <= SU2RAD::Logger::LOGLEVEL
                    Sketchup.set_status_text(line.strip())
                    msg.split("\n").each { |l|  printf "%s[%s] %s\n" % [prefix,levels[loglevel],l] }
                    SU2RAD::Logger::LOG.push(line)
                end
                if loglevel == -2
                    $SU2RAD_COUNTER.add('errors')
                elsif loglevel == -1
                    $SU2RAD_COUNTER.add('warnings')
                end
            rescue => e
                printf "## %s" % $!.message
                printf "## %s" % e.backtrace.join("\n## ")
                printf "\n[uimessage rescue] #{msg}\n"
            end
        end
        
        def writeLogFile(counter)

            SU2RAD::Logger::LOG.push( "###  finished: %s  ###" % Time.new() )
            SU2RAD::Logger::LOG.push( "###  %s  ###" % counter.getStatusLine() )

            logname = File.join('logfiles', "%s_export.log" % getConfig('SCENENAME'))
            logname = getFilename(logname)
            
            if not createFile(logname, SU2RAD::Logger::LOG.join("\n"))
                uimessage("Error: Could not create log file '#{logname}'")
                line = "### creating log file failed: %s  ###" % Time.new()
                printf "%s\n" % line
                Sketchup.set_status_text(line)
            else
                printf "%s\n" % line
                printf "%s\n" % line2
            end
        end
    end

end