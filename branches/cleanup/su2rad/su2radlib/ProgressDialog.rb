# OpenStudio
# Copyright (c) 2008-2009 Alliance for Sustainable Energy.  All rights reserved.
# See the file "License.txt" for additional terms and conditions.

require "wxSU/lib/Startup.rb"

class ProgressDialog < Wx::ProgressDialog

    def initialize(title, message = "", can_abort = true)

        if (can_abort)
            style = Wx::PD_AUTO_HIDE | Wx::PD_CAN_ABORT
        else
            style = Wx::PD_AUTO_HIDE
        end

        # Seems that even with AUTO_HIDE turned off, ProgressDialog still closes automatically once it reaches the max tick number.
        # For that reason, using 101 instead 100.
        
        if (RUBY_PLATFORM =~ /mswin/)
            super(title,  message, 101, WxSU.app.sketchup_frame, style)
        else
            # Needed to make the dialog look good on OS X
            # NOTE:  wxSU on Mac cannot yet set the sketchup_frame to be the parent for the dialog.
            super(title,  ("-" * 70), 101, nil, style)
        end

        # Make the dialog wider so that long object names will fit better
        set_size(Wx::Size.new(400, get_size.height))

        update(0, message)  # Needed to make the dialog look good on OS X

        center_on_parent(Wx::BOTH)
        #raise

        @canceled = false
    end


    def update_progress(percent, action = '', target = '')

        if (@canceled)
            continue = false
        else
            continue = update(percent, action + "\n" + target)

            if (RUBY_PLATFORM =~ /darwin/)
                get_sizer.recalc_sizes  # Needed to make the dialog look good on OS X
            end

            if (not continue)
                @canceled = true
                destroy
            end
        end

        return(continue)
    end


    def canceled?
        return(@canceled)
    end

end


def testProgress
    if (Sketchup.active_model)
        progress_dialog = ProgressDialog.new("title string")

        begin
            print "starting loop\n"
            (1..101).each { |i|
                print "loop at #{i}\n"
                sleep 1
                progress_dialog.update_progress(i)
            }
            print "loop finished\n\n"
        rescue
            print "an error occured\n"
        ensure
            progress_dialog.hide
            progress_dialog.destroy
        end

        if (progress_dialog.canceled?)
            UI.messagebox("You have canceled in the middle of saving a file.\nThe saved EnergyPlus file is not complete.\nIt's probably a good idea to try saving again.")
        end
    end
end

