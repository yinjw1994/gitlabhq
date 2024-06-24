#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'

class ReleaseEnvironmentsModel
  COMPONENTS = %w[gitaly registry kas mailroom pages gitlab shell praefect].freeze

  # Will generate a json object that has a key for every component and a value which is the environment combined with
  # short sha
  # Example:
  # {
  #  "gitaly": "15-10-stable-c7c5131c",
  #  "registry": "15-10-stable-c7c5131c",
  #  "kas": "15-10-stable-c7c5131c",
  #  "mailroom": "15-10-stable-c7c5131c",
  #  "pages": "15-10-stable-c7c5131c",
  #  "gitlab": "15-10-stable-c7c5131c",
  #  "shell": "15-10-stable-c7c5131c"
  # }
  def generate_json
    output_json = {}
    COMPONENTS.each do |component|
      output_json[component.to_s] = "#{environment}-#{ENV['CI_COMMIT_SHORT_SHA']}"
    end
    JSON.generate(output_json)
  end

  def set_required_env_vars?
    required_env_vars = %w[DEPLOY_ENV]

    required_env_vars.each do |var|
      if ENV.fetch(var, nil).to_s.empty?
        puts "Missing required environment variable: #{var}"
        return false
      end
    end
    true
  end

  def environment
    match = ENV['CI_COMMIT_REF_SLUG'].match(/^v?([\d]+)\.([\d]+)\.[\d]+[\d\w-]*-ee$/)
    @environment ||= if match
                       "#{match[1]}-#{match[2]}-stable"
                     else
                       ENV['CI_COMMIT_REF_SLUG'].sub("-ee", "")
                     end
  end
end

# Outputs in `dotenv` format the ENVIRONMENT and VERSIONS to pass to release environments e.g.
# ENVIRONMENT=15-10-stable
# VERSIONS={"gitaly":"15-10-stable-c7c5131c","registry":"15-10-stable-c7c5131c","kas":"15-10-stable-c7c5131c", ...
if $PROGRAM_NAME == __FILE__
  model = ReleaseEnvironmentsModel.new
  raise "Missing required environment variable." unless model.set_required_env_vars?

  File.open(ENV['DEPLOY_ENV'], 'w') do |file|
    file.puts "ENVIRONMENT=#{model.environment}"
    file.puts "VERSIONS=#{model.generate_json}"
  end

  puts File.read(ENV['DEPLOY_ENV'])
end
