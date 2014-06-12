watch( 'tests/test_.*\.rb' )                 {|md| system("ruby #{md[0]}") }
watch( '^(?!tests\/test_).*\.rb' )           {|md| system("ruby tests/test_#{md[0]}") }
