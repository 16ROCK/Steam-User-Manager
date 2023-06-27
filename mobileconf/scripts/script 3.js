Object.seal && [ Object, Array, String, Number ].map( function( builtin ) { Object.seal( builtin.prototype ); } );
$J = jQuery.noConflict();
VALVE_PUBLIC_PATH = "https://community.cloudflare.steamstatic.com/public/";
document.addEventListener('DOMContentLoaded', function(event) { SetupTooltips( { tooltipCSSClass: 'community_tooltip'} ); });