//initiate the client
var oh = Ohmage("/app", "documents-app")

//attach global callbacks
oh.callback("done", function(x, status, req){
})

//global error handler. In ohmage 200 means unauthenticated
oh.callback("error", function(msg, code, req){
	(code == 200) ? window.location.replace("../web/#login") : alert("Error!\n" + msg);
});

//main app
oh.user.whoami().done(function(username){
	
	//make sure we don't timeout
	oh.keepalive();
        //grab list of documents and provide them to datatables	
        oh.document.search("").done(function(x){
	 var data = $.map(x, function(val,key){val.uuid=key; return val;});
         $.each(data, function(k,v){
          v['campaign_class'] = [];
	  v['button'] = '<form action="/app/document/read/contents" method="post" target="outputframe"><input type="hidden" name="document_id" value="'+v['uuid']+'"><input type="hidden" name="client" value="doc_app"><input type="submit" class="btn btn-primary" value="Download">'
	  $.isEmptyObject(v['campaign_role']) || v['campaign_class'].push(_.keys(v['campaign_role']));
	  $.isEmptyObject(v['class_role']) || v['campaign_class'].push(_.keys(v['class_role']));
         });
         var table = $('#documents').DataTable( {
          "data": data,
          "columns": [
           { "data": "name" },
           { "data": "creator" },
           { "data": "campaign_class[, ]" },
           { "data": "creation_date" },
           { "data": "privacy_state" },
           { "data": "button" }
          ]
         });
	});        
});
