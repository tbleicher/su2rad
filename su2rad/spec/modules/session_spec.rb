require_relative '../../su2radlib/modules/session.rb'


require 'stringio'

class SessionState
  attr_accessor :config
  def initialize
    @config = {}
  end
end

def capture_stdout(&blk)
  old = $stdout
  $stdout = fake = StringIO.new
  blk.call
  fake.string
ensure
  $stdout = old
end

class SessionUser
  include Tbleicher::Su2Rad::Session
  attr_accessor :state
  def initialize(state)
    @state = state
  end
end

class SessionUserB
  include Tbleicher::Su2Rad::Session
  attr_accessor :state
  def initialize(state)
    @state = state
  end
end


describe Tbleicher::Su2Rad::Session do

  before(:each) do
    state = SessionState.new()
    @foo = SessionUser.new(state)
  end

  it "is defined within the Tbleicher::Su2Rad module" do
    expect(Tbleicher::Su2Rad::Session).to be_truthy
  end

  it "is provides setConfig and getConfig method" do
    @foo.setConfig("foo", "bar")
    expect(@foo.getConfig("foo")).to eq("bar")
  end

  it "has a shared state between classes" do
    @foo.setConfig("foo", "bar")
    b = SessionUserB.new(@foo.state)
    expect(b.getConfig("foo")).to eq("bar")
  end 

end