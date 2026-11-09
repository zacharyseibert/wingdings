Pod::Spec.new do |s|
  s.name           = 'PlaceSearch'
  s.version        = '1.0.0'
  s.summary        = 'MapKit place search'
  s.author         = ''
  s.homepage       = 'https://github.com/zacharyseibert/wingdings'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'MapKit', 'CoreLocation'
  s.source_files   = '**/*.swift'
end
