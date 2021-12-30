function req(method, url, body, header){
    let req = new XMLHttpRequest();
    req.open(method, url, true);
    header = {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': '*/*', ...header, };
    for(let key in header){
        req.setRequestHeader(key, header[key]);
    }
    if(/^post$/i.test(method) && body){
        let formData = [];
        for(let key in body){
            formData.push(`${key}=${encodeURIComponent(body[key])}`);
        }
        req.send(formData.join('&'));
    }else{
        req.send();
    }
    req.timeout = 90000;
    let res = data => {
        try{
            return JSON.parse(data);
        }catch(err){
            return data;
        }
    };
    req.onloadend = () => {
        if(res.always){
            res.always(res(req.response));
        }
        if(req.status != 200){
            if(res.fail){
                res.fail(res(req.response));
            }
        }else{
            if(res.done){
                res.done(res(req.response));
            }
        }
    };
    req.done = cb => (res.done = cb, req);
    req.fail = cb => (res.fail = cb, req);
    req.always = cb => (res.always = cb, req);
    return req;
};