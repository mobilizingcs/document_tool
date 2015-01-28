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
$(function() {
oh.user.whoami().done(function(username){
	
	//make sure we don't timeout
	oh.keepalive();

  oh.user.info().done(function(x){
    $.each(x[username]['classes'], function(k,v) {
      $('#modal-class')
        .append($("<option></option>")
        .attr("value",k)
        .text(v));
    });
    $('#modal-class').multiselect();
    $.each(x[username]['campaigns'], function(k,v) {
      $('#modal-campaign')
        .append($("<option></option>")
        .attr("value",k)
        .text(v));
    });
    $('#modal-campaign').multiselect();
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
      $('#modal-download').show();
      var doc_uuid = button.data('uuid');
      var editing_doc = _.filter(document_data, {uuid: doc_uuid});
      $('#detail-modal-title').text(editing_doc[0]['name']);
      $('#modal-save').text('Update');
      $('#modal-group-file').hide();
      $('#modal-name').val(editing_doc[0]['name']);
      $('#modal-description').text(editing_doc[0]['description']);
      $('#modal-creator').val(editing_doc[0]['creator']);
      $('#modal-privacy').val(editing_doc[0]['privacy_state']);
      $('#modal-download').show();
      $('#modal-delete').show();
      $('#modal-delete').data('uuid', editing_doc[0]['uuid']);
      $("input[name='document_id']", "#detail-modal").val(editing_doc[0]['uuid']);
      var class_values = $.map(editing_doc[0]['class_role'], function(val,key){ return key;});
      $('#modal-class').multiselect('select', class_values);
      var campaign_values = $.map(editing_doc[0]['campaign_role'], function(val,key){ return key;});
      $('#modal-campaign').multiselect('select', campaign_values);
      if(editing_doc[0]['user_max_role'] == "reader") {
        $('.writer').prop('disabled', true);
        $('#modal-campaign').multiselect('disable');
        $('#modal-class').multiselect('disable');
        $('#modal-delete').hide();
      } else {
        $('.writer').prop('disabled', false);
        $('#modal-campaign').multiselect('enable');
        $('#modal-class').multiselect('enable');
        $('#modal-delete').show();
      }
    }else{
      $('.writer').prop('disabled', false);
      $('#modal-campaign').multiselect('enable');
      $('#modal-class').multiselect('enable');
      $('#detail-modal-title').text("Add New Document");
      $('#modal-group-file').show();
      $('#modal-name').val('');
      $('#modal-description').text('');
      $('#modal-creator').val(username);
      $('#modal-privacy').val('private');
      $('#modal-download').hide();
      $('#modal-delete').hide();
      $('#modal-class').multiselect('deselectAll', false);
      $('#modal-campaign').multiselect('deselectAll', false);
    }
  });
  $('#modal-delete').on('click', function () {
    var $el = $(this)
    if (confirm("Are you sure you want to delete this document? This action is irreversible!")) {
      console.log("I would normally be deleting: "+$el.data('uuid'));
      oh.document.delete({
        document_id: $el.data('uuid')
      }).done(function(){
        alert("Successfully deleted this document");
        location.reload();
      })
    }
  });
  $('#modal-file').change(function(e){
    $('#modal-name').val($('#modal-file').val().split('\\').pop());
  });
  var createdocFormOptions = {
    beforeSubmit: prepForm,
    success: showSuccess,
    dataType: "json"
  }
  //$("createdoc").ajaxForm(createdocFormOptions);

  $('#createdoc').submit(function(e){
    $(this).ajaxSubmit(createdocFormOptions);
    return false;
  });
  function prepForm() {
    $("#submit_auth_token").val($.cookie("auth_token"));
    $.isEmptyObject($("#modal-class")) || $("#submit_class").val($("#modal-class").val().join(';reader,') + ";reader");
    $.isEmptyObject($("#modal-campaign")) || $("#submit_campaign").val($("#modal-campaign").val().join(';reader,') + ";reader");
    return true;
  }
  function showSuccess(responseText){
    alert(responseText);
    location.reload();
  }
});
});