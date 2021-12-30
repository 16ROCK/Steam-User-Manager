(() => {
	let login = document.querySelector('#account_dropdown>div>a>span.persona'), id;
	if(login && (login = login.innerText)){
		window.crypto.subtle.digest({name: "SHA-1"}, new Uint8Array(login.match(/.{1}/g).map(s => s.charCodeAt()))).then(result => {
			id = [...new Uint8Array(result)].map(n => n.toString(16)).join('');
		});
	    let open = XMLHttpRequest.prototype.open;
	    XMLHttpRequest.prototype.open = function(){
	        let send = this.send;
	        this.send = function(){
	            this.setRequestHeader(`${chrome.runtime.id}_id`, id);
	            send.apply(this, arguments);
	        };
	        open.apply(this, arguments);
	    };
	}
})();