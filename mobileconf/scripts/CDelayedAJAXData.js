function CDelayedAJAXData( strURL, msDelayBeforeAJAX )
{
	this.m_$prefix = null;
	this.m_$item = null;
	this.m_$Data = null;
	this.m_bAJAXFailed = false;
	this.m_timerDelayedAJAX = null;
	this.m_bAJAXRequestMade = false;
	this.m_msDelayBeforeAJAX = msDelayBeforeAJAX;
	this.m_strURL = strURL;

	this.m_fnOnAJAXComplete = null;
}

CDelayedAJAXData.prototype.GetAJAXParams = function()
{
	return GetDefaultCommunityAJAXParams( this.m_strURL, 'GET' );
};

CDelayedAJAXData.prototype.QueueAjaxRequestIfNecessary = function()
{
	if ( !this.m_$Data && !this.m_bAJAXRequestMade )
	{
		var _this = this;
		this.m_timerDelayedAJAX = window.setTimeout( function() {
			_this.m_timerDelayedAJAX = null;
			_this.m_bAJAXRequestMade = true;
			var rgAJAXParams = _this.GetAJAXParams();
			$J.ajax( rgAJAXParams )
				.done( function(data) {
                    let strBuildHover = data.match(/BuildHover\(\s*'([^']*)',\s*([\s\S]*?)\s*\);\s{3,}/),
                    strg_rgAppContextData = data.match(/g_rgAppContextData\s*=\s*([^;]*);/);
                    if(strBuildHover){
                        _this.m_$prefix = strBuildHover[1];
                        _this.m_$item = JSON.parse(strBuildHover[2]);
                    }
                    if(strg_rgAppContextData){
                        _this.m_$rgAppContextData = g_rgAppContextData = JSON.parse(strg_rgAppContextData[1]);
                    }
					_this.m_$Data = $J(data.replace(/<script([\s\S]*?)<\/script>/g, ''));
					if ( _this.m_fnOnAJAXComplete )
						_this.m_fnOnAJAXComplete();
				}).fail( function() {
					_this.m_bAJAXFailed = true;
				});
		}, this.m_msDelayBeforeAJAX );
	}
};

CDelayedAJAXData.prototype.CancelAJAX = function()
{
	if ( this.m_timerDelayedAJAX )
		window.clearTimeout( this.m_timerDelayedAJAX );

	this.m_fnOnAJAXComplete = null;
};

CDelayedAJAXData.prototype.RunWhenAJAXReady = function( fnOnReady )
{
	if ( this.m_$Data )
		fnOnReady();
	else if ( !this.m_bAJAXFailed )
	{
		this.m_fnOnAJAXComplete = fnOnReady;
		this.QueueAjaxRequestIfNecessary();
	}
	// if ajax failed we will not call fnOnReady
};

CDelayedAJAXData.prototype.Show = function( $HoverContent )
{
	$HoverContent.children().detach();
	$HoverContent.append( this.m_$Data );
	if(this.m_$g_rgAppContextData){
		UserYou.LoadContexts(this.m_$g_rgAppContextData);
	}
	if(this.m_$prefix && this.m_$item){
		BuildHover(this.m_$prefix, this.m_$item);
		$(this.m_$prefix).show();
	}
};