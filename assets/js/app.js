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
    is_admin = x[username]['permissions']['is_admin']
    var classes = _.map(x[username]['classes'], function(value,key){ return {"urn":key,"name":value}; });
    sorted_classes = _.sortBy(classes, "name");
    $.each(sorted_classes, function(k,v) {
      $('#modal-class')
        .append($("<option></option>")
        .attr("value",v['urn'])
        .text(v['name']));
    });
    $('#modal-class').multiselect({maxHeight:200});
    
    var campaigns = _.map(x[username]['campaigns'], function(value,key){ return {"urn":key,"name":value}; });
    sorted_campaigns = _.sortBy(campaigns, "name");
    $.each(sorted_campaigns, function(k,v) {
      $('#modal-campaign')
        .append($("<option></option>")
        .attr("value",v['urn'])
        .text(v['name']));
    });
    $('#modal-campaign').multiselect({maxHeight:200});
  });
        //grab list of documents and provide them to datatables	
  oh.document.search("").done(function(x){
	 document_data = $.map(x, function(val,key){val.uuid=key; return val;});
    $.each(document_data, function(k,v){
     v['size'] = bytesToSize(v['size'])
     v['campaign_class'] = [];
     v['edit-button'] = '<button type="button" class="btn btn-success" data-toggle="modal" data-target="#detail-modal" data-uuid="'+v['uuid']+'">Edit</button>'
	   v['button'] = '<form action="/app/document/read/contents" method="post" target="outputframe"><input type="hidden" name="document_id" value="'+v['uuid']+'"><input type="hidden" name="client" value="doc_app"><input type="submit" class="btn btn-primary" value="Download">'
	   //make the class/campaign list be their names instead of urns.
     if (!$.isEmptyObject(v['class_role'])){
       var attached_class_list = _.keys(v['class_role'])
       $.each(attached_class_list, function(index,value){
        var find_me = {};
        find_me['urn'] = value;
        var name_lookup = _.findWhere(sorted_classes, find_me);
        var push_me = (typeof name_lookup === "undefined") ? value : name_lookup.name;
        v['campaign_class'].push(push_me);
       });
     }
     if (!$.isEmptyObject(v['campaign_role'])){
       var attached_campaign_list = _.keys(v['campaign_role'])
       $.each(attached_campaign_list, function(index,value){
        var find_me = {};
        find_me['urn'] = value;
        var name_lookup = _.findWhere(sorted_campaigns, find_me);
        var push_me = (typeof name_lookup === "undefined") ? value : name_lookup.name;
        v['campaign_class'].push(push_me);
       });
     }
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
     { "data": "size" },
     { "data": "edit-button" },
     { "data": "button" }
    ],
    "columnDefs": [
       { type: 'file-size', targets: -3 }
     ]
   });
	});

  //modify modal contents if we click the edit button?
  $('#detail-modal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget);
    if(button.data('uuid')){
      $('#modal-class').multiselect('deselectAll', false);
      $('#modal-campaign').multiselect('deselectAll', false);
      $('#modal-download').show();
      var doc_uuid = button.data('uuid');
      var editing_doc = _.filter(document_data, {uuid: doc_uuid});
      $('#detail-modal-title').text(editing_doc[0]['name']);
      $('#modal-save').text('Update');
      $('#modal-group-file').hide();
      $('#form-group-size').show();
      $('#modal-size').val(editing_doc[0]['size'])
      $('#modal-name').val(editing_doc[0]['name']);
      $('#modal-description').text(editing_doc[0]['description']);
      $('#modal-creator').val(editing_doc[0]['creator']);
      $('#modal-privacy').val(editing_doc[0]['privacy_state']);
      $('#modal-download').show();
      $('#modal-delete').show();
      $('#modal-delete').data('uuid', editing_doc[0]['uuid']);
      $("input[name='document_id']", "#detail-modal").val(editing_doc[0]['uuid']);
      class_values = $.map(editing_doc[0]['class_role'], function(val,key){ return key;});
      $('#modal-class').multiselect('select', class_values);
      campaign_values = $.map(editing_doc[0]['campaign_role'], function(val,key){ return key;});
      $('#modal-campaign').multiselect('select', campaign_values);
      if(editing_doc[0]['user_max_role'] == "reader" && !is_admin) {
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
      $('#modal-save').text('Save');
      $('#modal-group-file').show();
      $('#form-group-size').hide();
      $('#modal-name').val($('#modal-file').val().split('\\').pop());
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
    $('#modal-delete').prop('disabled', true);
    var $el = $(this)
    if (confirm("Are you sure you want to delete this document? This action is irreversible!")) {
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
    success: showSuccess,
    dataType: "json"
  }

  $('#createdoc').submit(function(e){
    e.preventDefault();
    var add_class = ($("#modal-class").val() == null) ? "" : $("#modal-class").val().join(';reader,') + ";reader";
    var add_campaign = ($("#modal-campaign").val() == null) ? "" : $("#modal-campaign").val().join(';reader,') + ";reader";
    switch($('#modal-save').text()) {
      case "Save":
        var createFormOptions = {
         success: showSuccess,
         url: "/app/document/create",
         data: {
          "client": "doc_app",
          "auth_token": $.cookie("auth_token"),
          "document_name": $("#modal-name").val(),
          "description": $("#modal-description").text(),
          "privacy_state": $("#modal-privacy").val(),
          "document_class_role_list": add_class,
          "document_campaign_role_list": add_campaign
         },
         dataType: "json"
        }
        if ($('#modal-file').val() == "" ) {
         alert('Please select a document to upload')
        } else if ( $("#modal-class").val() == null && $("#modal-campaign").val() == null ) {
         alert('Please link your document to either a class or a campaign');
        } else {
        $('#modal-save').prop('disabled', true);
        $(this).ajaxSubmit(createFormOptions);
        }
        break;
      case "Update":
        var class_remove = _.difference(class_values, $("#modal-class").val()).join(',');
        var campaign_remove = _.difference(campaign_values, $("#modal-campaign").val()).join(',');
        var updateFormOptions = {
         success: showSuccess,
         url: "/app/document/update",
         data: {
          "client": "doc_app",
          "auth_token": $.cookie("auth_token"),
          "document_name": $("#modal-name").val(),
          "description": $("#modal-description").text(),
          "privacy_state": $("#modal-privacy").val(),
          "class_role_list_add": add_class,
          "campaign_role_list_add": add_campaign,
          "class_list_remove": class_remove,
          "campaign_list_remove": campaign_remove,
          "document_id": $("#modal-delete").data('uuid')
         },
         dataType: "json"
        }
        if ($("#modal-class").val() == null && $("#modal-campaign").val() == null) {
          alert('Please link your document to either a class or a campaign');
        } else {
          $('#modal-save').prop('disabled', true);
          $(this).ajaxSubmit(updateFormOptions);
          //var class_to_delete = _.difference(class_values, $("#modal-class").val());
          //var campaign_to_delete = _.difference(campaign_values, $("#modal-campaign").val());
          //var submit_class_remove = class_to_delete.join(',');
          //var submit_campaign_remove = campaign_to_delete.join(',');
          //oh.document.update({
          //  document_id: $("#modal-delete").data('uuid'),
          //  description: $("#modal-description").text(),
          //  privacy_state: $("#modal-privacy").val(),
          //  class_role_list_add: $('#submit_class').val(),
          //  class_list_remove: submit_class_remove,
          //  campaign_role_list_add: $('#submit_campaign').val(),
          //  campaign_list_remove: submit_campaign_remove
          //}).done(function(x){
          //  alert("Document updated successfully!");
          //  location.reload();
          //}).error(function(msg){
          //  $('#modal-save').prop('disabled', false);
          //});
        }
        break;
    }
    
    return false;
  });
  function showSuccess(responseText, statusText, xhr, $form){
    if(responseText['result'] == "success"){
      alert("Document created successfully!");
      location.reload();
    } else {
      alert(JSON.stringify(responseText['errors']))
    }
  };
  //thanks to http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
  function bytesToSize(bytes) {
   if(bytes == 0) return '0 Byte';
   var k = 1000;
   var sizes = ['BB', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return (bytes / Math.pow(k, i)).toPrecision(3) + sizes[i];
}
});
});