
function SendMobileConfirmationOp( op, confirmationID, confirmationKey, success, error )
{
	GetValueFromLocalURL( 'steammobile://steamguard?op=conftag&arg1=' + op, 5,
		function( data ) {

			queryString = "op=" + op + "&" + data;
			queryString += "&cid=" + confirmationID;
			queryString += "&ck=" + confirmationKey;
		
			$J.ajax( {
				url: 'https://steamcommunity.com/mobileconf/ajaxop',

				data: queryString,

				success: function( data, textStatus, jqXHR ) {
					 if ( data && data.success )
					 {
						 success( data );
					 }
					 else
					 {
						 if ( error )
							 error( data );
					 }
				},

				error: function( jqXHR, textStatus ) {
					if ( error )
						error( null );
					 }
			});
		},
		error,
		error
	);
}


function SendMultiMobileConfirmationOp( op, rgConfirmationId, rgConfirmationKey, success, error )
{
	GetValueFromLocalURL( 'steammobile://steamguard?op=conftag&arg1=' + op, 5,
		function ( data )
		{
			queryString = "op=" + op + "&" + data;

			for ( var i = 0; i < rgConfirmationId.length; i++ )
			{
				queryString += "&cid[]=" + rgConfirmationId[i];
				queryString += "&ck[]=" + rgConfirmationKey[i];
			}

			$J.ajax( {
				url: 'https://steamcommunity.com/mobileconf/multiajaxop',

				data: queryString,
				method: 'POST',

				success: function( data, textStatus, jqXHR ) {
					if ( data && data.success )
					{
						success( data );
					}
					else
					{
						if ( error )
							error( data );
					}
				},

				error: function( jqXHR, textStatus ) {
					if ( error )
						error( null );
				}
			});
		},
		error,
		error
	);
}


function RemoveConfirmationFromList( confirmationID )
{
	$J('#conf' + confirmationID).remove();
	$J('#conf' + confirmationID + '_copy').remove();
}

function ConfirmFromDetails( confirmationID, confirmationKey )
{
	SendMobileConfirmationOp( 'allow', confirmationID, confirmationKey,
		function( data )
		{
			// Delete the selected confirmation item from the list
			RemoveConfirmationFromList( confirmationID );

			// Go back to the list
			setTimeout( function() { window.history.back(); }, 1 );
		},

		function( data )
		{
			if ( typeof data != 'undefined' && data && typeof data.message != 'undefined' )
			{
				ShowAlertDialog(
						'인증 오류',
						data.message,
						'확인'
				);

				return;
			}

			ShowAlertDialog(
					'인증 오류',
					'동작을 실행하는 데 실패했습니다. 나중에 다시 시도해 주세요.',
					'확인'
			);
		}
	);
}


function CancelFromDetails( confirmationID, confirmationKey )
{
	SendMobileConfirmationOp( 'cancel', confirmationID, confirmationKey,
		function( data )
		{
			// Delete the selected confirmation item from the list
			RemoveConfirmationFromList( confirmationID );

			// Go back to the list
			setTimeout( function() { window.history.back(); }, 1 );
		},

		function( data )
		{
			if ( typeof data != 'undefined' && data && typeof data.message != 'undefined' )
			{
				ShowAlertDialog(
						'인증 오류',
						data.message,
						'확인'
				);

				return;
			}

			ShowAlertDialog(
					'인증 오류',
					'거래를 취소하는 데 실패했습니다. 나중에 다시 시도해주세요.',
					'확인'
			);
		}
	);
}


function ActionForAllSelected( op )
{
	var $rgChecked = $J('.mobileconf_list_checkbox input:checked');
	if ( $rgChecked.length == 0 )
	{
		return;
	}

	var rgConfirmationId = [];
	var rgConfirmationKey = [];

	$J.each( $rgChecked, function( key ) {
		var $this = $J(this);
		var nConfirmationId = $this.data('confid');
		var nConfirmationKey = $this.data('key');

		rgConfirmationId.push( nConfirmationId );
		rgConfirmationKey.push( nConfirmationKey );
	});

	SendMultiMobileConfirmationOp( op, rgConfirmationId, rgConfirmationKey,
			function( data )
			{
				for ( var i = 0; i < rgConfirmationId.length; i++ )
				{
					RemoveConfirmationFromList( rgConfirmationId[i] );
				}

				var nChecked = $J('.mobileconf_list_checkbox input:checked').length;
				var $elButtons = $J( '#mobileconf_buttons' );

				if ( nChecked == 0 )
				{
					$elButtons.css( 'bottom', -$elButtons.height() + 'px' );
				}

				// Show the "All done" text instead of the list if applicable
				if ( $J('.mobileconf_list_entry').length == 0 )
				{
					$J( '#mobileconf_done' ).show();
				}
				else
				{
					$J( '#mobileconf_list' ).show();
				}
			},

			function( data )
			{
				if ( typeof data != 'undefined' && data && typeof data.message != 'undefined' )
				{
					ShowAlertDialog(
							'인증 오류',
							data.message,
							'확인'
					);

					return;
				}

				ShowAlertDialog(
						'인증 오류',
						'동작을 실행하는 데 실패했습니다. 나중에 다시 시도해 주세요.',
						'확인'
				);
			}
	);
}

function ReportMobileconfError( err )
{
	$J.ajax( {
		url: 'https://steamcommunity.com/steamguard/reporterror',
		type: 'POST',
		data: {
			op: 'MobileConfDetails',
			e: err,
			sessionid: g_sessionID
		}
	} );
}

var g_bClickInProgress = false;
var g_bShowingDetails = false;
var g_strClickedId = null;
$J( function() {
	var $elDetails = $J( '#mobileconf_details' );
	$elDetails.css( 'top', $J(window).height() );
	$elDetails.css( 'position', 'fixed' );
	$elDetails.css( 'opacity', 0 );

	$J('.mobileconf_list_entry').click( function() {
		if ( g_bClickInProgress )
			return;

		var $this = $J(this);

		g_bClickInProgress = true;
		g_strClickedId = $this.attr('id');
		var nConfirmationId = $this.data('confid');
		var nConfirmationKey = $this.data('key');

		
		// Make a copy of the clicked item
		var $elCopy = $this.clone();
		$elCopy.attr( 'id', g_strClickedId + '_copy' );
		$elCopy.addClass( 'copy' );

		// We can't use history.pushState because the Android app's onPageFinished may need to know the difference
		// between the initial page load and us loading details.
		location.hash = 'conf_' + nConfirmationId;

		// Set the copy to display fixed and place it in the same location of the page
		$elCopy.css( 'position', 'fixed' );
		$elCopy.find( '.mobileconf_list_entry_sep' ).hide();
		$elCopy.css( 'top', $this.offset().top - $J(window).scrollTop() );
		$this.parent().append( $elCopy );
		$elCopy.show();
		//$elCopy.find( '.mobileconf_offers_summary_chevron' ).css( 'transform', 'rotate(90deg)' );

		// Slide the fixed copy up to the top of the page
		$elCopy.css( 'top', 0 );

		// Fade out all entries including our copy
		$J('.mobileconf_list_entry').css( 'opacity', 0 );

		// The actual clicked one immediately becomes hidden
		$this.find( '.mobileconf_list_entry_content' ).css( 'opacity', '0' );

		var $elDetails = $J( '#mobileconf_details' );
		$elDetails.html( $J('#mobileconf_throbber').html() );
		$elDetails.css( 'opacity', 0 );
		$elDetails.css( 'top', $J(window).height() + 'px' );
		$elDetails.show();
		$elDetails.css( 'top', $J('.responsive_page_template_content').offset().top );
		$elDetails.css( 'opacity', 1 );
		g_bShowingDetails = true;

		var $btnCancel = $J('#mobileconf_buttons .mobileconf_button_cancel');
		var $btnAccept = $J('#mobileconf_buttons .mobileconf_button_accept');
		$btnCancel.text( $this.data('cancel') );
		$btnAccept.text( $this.data('accept') );

		$btnCancel.click( function() {
			CancelFromDetails( nConfirmationId, nConfirmationKey );
		});

		$btnAccept.click( function() {
			ConfirmFromDetails( nConfirmationId, nConfirmationKey );
		});

		var $elButtons = $J( '#mobileconf_buttons' );
		$elButtons.css( 'bottom', -$elButtons.height() + 'px' );
		$elButtons.show();
		$elButtons.css( 'bottom', '0' );

		// Begin loading in the details
		GetValueFromLocalURL( 'steammobile://steamguard?op=conftag&arg1=details' + nConfirmationId, 5, function( httpParams )
		{
			$J.ajax( {
				url: 'https://steamcommunity.com/mobileconf/details/' + nConfirmationId + '?' + httpParams,
				type: 'GET'
							} ).done( function ( responseData ) {
				if ( responseData.success )
				{
					if ( responseData.html )
					{
	                    $elDetails.html(responseData.html.replace(/<script([\s\S]*?)<\/script>/g, ''));
	                    let strBuildHover = responseData.html.match(/BuildHover\(\s*'([^']*)',\s*([\s\S]*?),\s*UserYou\s*\);/),
	                    strg_rgAppContextData = responseData.html.match(/var\s*g_rgAppContextData\s*=\s*([\s\S]*?);\r\n/),
	                    strg_bIsTrading = responseData.html.match(/g_bIsTrading\s*=\s*([^;]*);\r\n/);
	                    if(strg_bIsTrading){
	                        g_bIsTrading = JSON.parse(strg_bIsTrading[1]);
	                    }
	                    if(strg_rgAppContextData){
	                        window.g_rgAppContextData = JSON.parse(strg_rgAppContextData[1]);
	                    }
	                    if(strBuildHover){
	                        BuildHover(strBuildHover[1], JSON.parse(strBuildHover[2]), UserYou);
	                        $('confiteminfo').show();
	                    }
					}
					else
					{
												$elDetails.text( '' );
						ReportMobileconfError( "missing html" );
					}
				}
				else
				{
					ShowAlertDialog(
							'인증 오류',
							typeof responseData.message != 'undefined' ? responseData.message : '거래 인증에 대한 정보를 불러오는 데 문제가 생겼습니다. 나중에 다시 시도해주세요.',
							'확인'
					).always( function() {
						window.history.back();
					} );
				}
			} ).fail( function() {
				ShowAlertDialog(
						'인증 오류',
						'거래 인증에 대한 정보를 불러오는 데 문제가 생겼습니다. 나중에 다시 시도해주세요.',
						'확인'
				).always( function() {
					window.history.back();
				} );
			} );
		},
		function( calldata ) {
			if ( calldata )
			{
				ReportMobileconfError( "appapi error: " + calldata );
			}
			else
			{
				ReportMobileconfError( "appapi error: no data" );
			}

			ShowAlertDialog(
				'인증 오류',
				'모바일 앱에서 해당 승인 내용에 대한 정보를 불러오지 못했습니다. 기기를 껐다가 다시 켠 후 나중에 다시 요청해 주세요. 문제가 지속되면 해당 계정에 대해 다른 기기에서 Steam Guard 코드를 제공하도록 설정되어있는지 확인해 보세요. 이 경우 이 기기에 있는 인증기는 더 이상 유효하지 않습니다.',
				'확인'
			).always( function() {
				window.history.back();
			} );
		},
		function() {
			ReportMobileconfError( "appapi fatal" );
			ShowAlertDialog(
				'인증 오류' + ' (fatal)',
				'모바일 앱에서 해당 승인 내용에 대한 정보를 불러오지 못했습니다. 기기를 껐다가 다시 켠 후 나중에 다시 요청해 주세요. 문제가 지속되면 해당 계정에 대해 다른 기기에서 Steam Guard 코드를 제공하도록 설정되어있는지 확인해 보세요. 이 경우 이 기기에 있는 인증기는 더 이상 유효하지 않습니다.',
				'확인'
			).always( function() {
				window.history.back();
			} );
		} );

		// After the animation finishes, hide the list, and position the details
		setTimeout( function() {
			// If the user has already pressed the back button, then don't do anything here.
			if ( !g_bShowingDetails )
				return;

			$elCopy.hide();
			$J( '#mobileconf_list' ).hide();
			$J( '.mobileconf_list_entry' ).css( 'opacity', 1 );

			var $elDetails = $J( '#mobileconf_details' );
			$elDetails.css( 'position', 'static' );
		}, 550)
	});

	$J('.mobileconf_list_checkbox').click( function( e ) {
		e.stopPropagation();

		var nChecked = $J('.mobileconf_list_checkbox input:checked').length;
		var $elButtons = $J( '#mobileconf_buttons' );

		if ( nChecked > 0 )
		{
			var $btnCancel = $J( '#mobileconf_buttons .mobileconf_button_cancel' );
			var $btnAccept = $J( '#mobileconf_buttons .mobileconf_button_accept' );
			$btnCancel.unbind();
			$btnAccept.unbind();

			$btnCancel.text( '선택 항목 취소' );
			$btnAccept.text( '선택 항목 확인' );

			$btnCancel.click( function() {
				ActionForAllSelected( 'cancel' );
			});

			$btnAccept.click( function() {
				ActionForAllSelected( 'allow' );
			});

			if ( $elButtons.is(':hidden') )
			{
				$elButtons.css( 'bottom', -$elButtons.height() + 'px' );
				$elButtons.show();
			}
			$elButtons.css( 'bottom', '0' );
		}
		else
		{
			$elButtons.css( 'bottom', -$elButtons.height() + 'px' );
		}
	});

	$J(window).on('hashchange', function() {
		if ( !g_bClickInProgress )
			return;

		// This is only for going back, so ignore conf_ hashes.
		if ( location.hash.substr( 0, 6 ) == '#conf_' )
		{
			return;
		}

		// Hide the details and show the list again
		var $elDetails = $J( '#mobileconf_details' );
		$elDetails.css( 'top', $J(window).height() + 'px' );
		$elDetails.css( 'position', 'fixed' );
		$elDetails.css( 'opacity', 0 );

		var $btnCancel = $J('#mobileconf_buttons .mobileconf_button_cancel');
		var $btnAccept = $J('#mobileconf_buttons .mobileconf_button_accept');
		$btnCancel.unbind();
		$btnAccept.unbind();

		var $elButtons = $J( '#mobileconf_buttons' );
		$elButtons.css( 'bottom', -$elButtons.height() + 'px' );

		$J( '.mobileconf_list_entry' ).css( 'opacity', 1 );

		// Show the "All done" text instead of the list if applicable
		if ( $J('.mobileconf_list_entry').length == 0 )
		{
			$J( '#mobileconf_done' ).show();
		}
		else
		{
			$J( '#mobileconf_list' ).show();
		}

		g_bShowingDetails = false;

		// The copy comes back down
		var $elClicked = $J('#' + g_strClickedId);
		var $elCopy = $J('#' + g_strClickedId + '_copy');

		if ( $elCopy.length )
		{
			$elCopy.show();
			if ( $elClicked.length )
			{
				$elCopy.css( 'top', $elClicked.offset().top - $J( window ).scrollTop() + 'px' );
			}

			//$elCopy.find( '.mobileconf_offers_summary_chevron' ).css( 'transform', 'rotate(0deg)' );
		}

		setTimeout( function() {
			$J( '.mobileconf_list_entry_sep' ).show();
			$J( '.mobileconf_list_entry_content' ).css( 'opacity', 1 );
			$J( '.mobileconf_list_entry.copy' ).remove();
		}, 550 );

		// Allow for smoother animation by doing this after
		setTimeout( function() {
			$elDetails.hide();
			$elButtons.hide();

			// Allow user to click again
			g_bClickInProgress = false;
		}, 650 );
	} );
});
