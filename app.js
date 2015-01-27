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

  oh.user.info().done(function(x){
    console.log(x);
    $.each(x[username]['classes'], function(k,v) {
      $('#modal-class')
        .append($("<option></option>")
        .attr("value",k)
        .text(v));
    });
    $('#modal-class').multiselect();
  });
        //grab list of documents and provide them to datatables	
  oh.document.search("").done(function(x){
	 document_data = $.map(x, function(val,key){val.uuid=key; return val;});
    $.each(document_data, function(k,v){
     v['campaign_class'] = [];
     v['edit-button'] = '<button type="button" class="btn btn-success" data-toggle="modal" data-target="#detail-modal" data-uuid="'+v['uuid']+'">Edit</button>'
	   v['button'] = '<form action="/app/document/read/contents" method="post" target="outputframe"><input type="hidden" name="document_id" value="'+v['uuid']+'"><input type="hidden" name="client" value="doc_app"><input type="submit" class="btn btn-primary" value="Download">'
	   $.isEmptyObject(v['campaign_role']) || v['campaign_class'].push(_.keys(v['campaign_role']));
	   $.isEmptyObject(v['class_role']) || v['campaign_class'].push(_.keys(v['class_role']));
    });
   var table = $('#documents').DataTable( {
    "data": document_data,
	  "lengthMenu": [25, 50, 100, "All"],
	  "oSearch": {"sSearch": "",
  	 "bRegex": true
		},
    "columns": [
     { "data": "name" },
     { "data": "creator" },
     { "data": "campaign_class[, ]" },
     { "data": "creation_date" },
     { "data": "privacy_state" },
     { "data": "edit-button" },
     { "data": "button" }
    ]
   });
	});

  //modify modal contents if we click the edit button?
  $('#detail-modal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget);
    if(button.data('uuid')){
      var doc_uuid = button.data('uuid');
      var editing_doc = _.filter(document_data, {uuid: doc_uuid});
      $('#detail-modal-title').text(editing_doc[0]['name']);
      $('#modal-group-file').hide();
      $('#modal-name').val(editing_doc[0]['name']);
      $('#modal-description').text(editing_doc[0]['description']);
      $('#modal-privacy').val(editing_doc[0]['privacy_state']);
      var class_values = $.map(editing_doc[0]['class_role'], function(val,key){ return key;});
      $("#modal-class").val(class_values);
    }else{
      $('#detail-modal-title').text("Add New Document")
    }
  });
});