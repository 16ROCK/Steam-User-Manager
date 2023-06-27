setTimezoneCookies();
$J( function() {
	InitMiniprofileHovers();
	InitEmoticonHovers();
	ApplyAdultContentPreferences();
});
$J( function() {
	InitEconomyHovers(
		`https://community.cloudflare.steamstatic.com/public/css/skin_1/economy.css?v=wliPEsKn4dhI&l=${g_strLanguage}&_cdn=cloudflare`,
		"/mobileconf/economy_common.js",
		`/mobileconf/${g_strLanguage}/economy.js`
		);
});