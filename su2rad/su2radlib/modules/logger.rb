## logger2.rb

module Su2Rad

	module Logger

		Levels = ["I", "V", "D", "3", "4", "5", "E", "W"]
		
		class << self

			def clear
				@output = []
			end

			def closeLog(status="")
				output << "###  finished: %s  ###" % Time.new()
                output << "###  %s  ###" % status
			end

			def initLog(lines=[])
				@output = lines
			end

			def output
				@output ||= []
			end

			def error(message, sketchup=nil)
				log(message, -2, sketchup)
			end

			def nesting
				@nesting || 0
			end

			def level
				@level || 0
			end

			def level=(l)
				@level = l
			end

	        def log(message, loglevel=0, sketchup=nil, counter=nil)
	            begin
	                if loglevel <= level

	                	lines = format_message(message, loglevel, nesting)
	                    lines.each { |line| 
	                    	sketchup && sketchup.set_status_text(line)
	                    	printf "#{line}\n"
	                    	output << line
	                    }
	                end
	                if counter && loglevel == -2
	                    counter.add('errors')
	                elsif counter && loglevel == -1
	                    counter.add('warnings')
	                end

	            rescue => e
	                printf "## %s\n" % $!.message
	                printf "## %s\n" % e.backtrace.join("\n## ")
	                printf "\n[uimessage rescue] #{message}\n"
	            end
	        end
			
			def warning(message, sketchup=Sketchup)
				log(message, -1, sketchup)
			end

			def write(filename, sketchup=nil)
				begin
					f = File.open(filename, "a") #{ |f| f << output.join("\n") }
					f << output.join("\n")
				rescue => e
					printf "#ERR# %s\n" % $!.message
	                printf "## %s\n\n" % e.backtrace.join("\n## ")
					error("Error: Could not create log file '#{filename}'", sketchup)
                	error("### creating log file failed: %s  ###" % Time.new(), sketchup)
                end
			end

			#private

			def format_message(message, level, nlevel)
				prefix = "  " * nlevel
				mtype = Levels[level]
				message.split("\n").map { |line| "#{prefix}[#{mtype}] #{line}" }
			end
		end

		## mixin level methods from here
		def uimessage(message, level=0, sketchup=Sketchup, counter=nil)
			Su2Rad::Logger.log(message, level, sketchup, counter)
		end
	end
end