//initiate the client
var oh = Ohmage("/app", "documents")

//attach global callbacks
oh.callback("done", function(x, status, req){
})

//global error handler. In ohmage 200 means unauthenticated
oh.callback("error", function(msg, code, req){
	(code == 200) ? window.location.replace("/#login") : alert("Error!\n" + msg);
});

var table;

//main app
$(function() {
$(".spinner").show();
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
      $("#class_select").append($("<option />").text(v['name']).val(v['urn']));
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
  //grab list of documents and provide them to datatables	
  oh.document.search("").done(function(x){
	 document_data = $.map(x, function(val,key){val.uuid=key; return val;});
    $.each(document_data, function(k,v){
     v['size'] = bytesToSize(v['size'])
     v['classes_name'] = [];
     v['campaigns_name'] = [];
     v['campaigns'] = [];
     v['classes'] = [];
     v['edit-button'] = '<button type="button" class="btn btn-success" data-toggle="modal" data-target="#detail-modal" data-uuid="'+v['uuid']+'">Edit</button>'
	   v['button'] = '<form action="/app/document/read/contents" method="post" target="outputframe"><input type="hidden" name="document_id" value="'+v['uuid']+'"><input type="hidden" name="client" value="documents"><input type="submit" class="btn btn-primary" value="Download">'
	   //make the class/campaign list be their names instead of urns.
     if (!$.isEmptyObject(v['class_role'])){
       var attached_class_list = _.keys(v['class_role'])
       $.each(attached_class_list, function(index,value){
        var find_me = {};
        find_me['urn'] = value;
        var name_lookup = _.findWhere(sorted_classes, find_me);
        var push_me = (typeof name_lookup === "undefined") ? value : name_lookup;
        v['classes'].push(push_me.urn)
        v['classes_name'].push(push_me.name);
       });
     }
     if (!$.isEmptyObject(v['campaign_role'])){
       var attached_campaign_list = _.keys(v['campaign_role'])
       $.each(attached_campaign_list, function(index,value){
        var find_me = {};
        find_me['urn'] = value;
        var name_lookup = _.findWhere(sorted_campaigns, find_me);
        var push_me = (typeof name_lookup === "undefined") ? value : name_lookup;
        v['campaigns_name'].push(push_me.name);
        v['campaigns'].push(push_me.urn);
        //v['campaign_class'].push(push_me);
       });
     }
    });
   table = $('#documents').DataTable( {
    "data": document_data,
    "dom" : '<"pull-right"l><"pull-left"f>tip',
	  "lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
	  "oSearch": {"sSearch": "",
  	 "bRegex": true
		},
    "columns": [
     { "data": "name" },
     { "data": "creator" },
     { "data": "classes_name[, ]" },
     { "data": "last_modified" },
     { "data": "privacy_state" },
     { "data": "size" },
     { "data": "edit-button" },
     { "data": "button" },
     { "data": "classes"}
    ],
    "columnDefs": [
       { type: 'file-size', targets: -3 },
       {
         "targets": [ 8 ],
         "visible": false,
       },
     ],
    "initComplete": function(settings, json) {
      $(".spinner").hide();
    }
   });
   /* Custom filtering by date range */
   $.fn.dataTable.ext.search.push(
       function( settings, data, dataIndex ) {
           var time = Date.parse(data[3].replace(" ", "T"));
           if(!time) return true;

           var min = Date.parse($("#mindate").val());
           if (min && time < min) return false;

           var maxtxt = $("#maxdate").val();
           var max = Date.parse(maxtxt + "T23:55");
           if (maxtxt && max && time > max) return false;
           
           return true;
       }
   );

   /* Custom filtering by class */
   $.fn.dataTable.ext.search.push(
       function( settings, data, dataIndex ) {
           var selected_class = $("#class_select").val();
           if(!selected_class) return true;
           var classes = data[8].split(",");
           return (classes.indexOf(selected_class) >= 0)
       }
   );

   $('.datepicker').text("").datepicker({
       format: 'yyyy-mm-dd',
       autoclose: true,
       clearBtn: true
   }).change( function() {
       table.draw();
   });

   $("#class_select").change(function(){
       table.draw();
   })
	});
  }); //end of user_info/read callback block

  $('#documents').on('click', 'tbody tr', function () {
    var tr = $(this).closest('tr');
    var row = table.row( tr );
    if ( row.child.isShown() ) { //row is open, close.
      row.child.hide();
      tr.removeClass('shown');
    }
    else { // open row
      row.child( documentRow(row.data()) ).show();
      tr.addClass('shown');
    }
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
      $('#form-group-size').show();
      $('#modal-size').val(editing_doc[0]['size'])
      $('#modal-name').val(editing_doc[0]['name']);
      $('#modal-description').val(editing_doc[0]['description']);
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
      $('#modal-file').val('');
      $('#modal-name').val($('#modal-file').val().split('\\').pop());
      $('#modal-description').val('');
      $('#modal-creator').val(username);
      $('#modal-privacy').val('private');
      $('#modal-download').hide();
      $('#modal-delete').hide();
      $('#modal-class').multiselect('deselectAll', false);
      $('#modal-class').multiselect('updateButtonText');
      $('#modal-campaign').multiselect('deselectAll', false);
      $('#modal-campaign').multiselect('updateButtonText');
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
          "description": $("#modal-description").val(),
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
        } else if ($("#modal-name").val() == "") {
          alert("Please enter at least one character for your document's name");
        } else {
        $('#modal-save').prop('disabled', true);
        $(this).ajaxSubmit(createFormOptions);
        }
        break;
      case "Update":
        if ($("#modal-file").val() == "" ) {
          $("#modal-file").prop("name", "");
        }
        var class_remove = _.difference(class_values, $("#modal-class").val()).join(',');
        var campaign_remove = _.difference(campaign_values, $("#modal-campaign").val()).join(',');
        var updateFormOptions = {
         success: updateshowSuccess,
         url: "/app/document/update",
         data: {
          "client": "doc_app",
          "auth_token": $.cookie("auth_token"),
          "document_name": $("#modal-name").val(),
          "description": $("#modal-description").val(),
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
        } else if ($("#modal-name").val() == "") {
          alert("Please enter at least one character for your document's name");
        } else {
          $('#modal-save').prop('disabled', true);
          $(this).ajaxSubmit(updateFormOptions);
        }
        break;
    }
    
    return false;
  });

  function documentRow(document){
    var row = $('<div/>').addClass('row').addClass("response-row");
    var col1 = $("<div />").addClass("col-md-6").appendTo(row);
    var col2 = $("<div />").addClass("col-md-6").appendTo(row);
    makep("Description", document.description || "No description.").appendTo(col1);
    makep("Classes", document.classes_name.join(", ") || "No Classes.").appendTo(col1);
    makep("Campaigns", document.campaigns_name.join(", ") || "No Campaigns.").appendTo(col1);
    makep("Created", document.creation_date).appendTo(col1);
    makep("ID", document.uuid).appendTo(col1);
    return row;
  }

  function makep(type, content){
      var p = $("<p/>")
      $("<strong/>").text(type + ": ").appendTo(p);
      $("<i/>").text(content).appendTo(p);
      return p;
  }
  function showSuccess(responseText, statusText, xhr, $form){
    if(responseText['result'] == "success"){
      alert("Document created successfully!");
      location.reload();
    } else {
      alert(JSON.stringify(responseText['errors']))
    }
  };
  function updateshowSuccess(responseText, statusText, xhr, $form){
    if(responseText['result'] == "success"){
      alert("Document updated successfully!");
      location.reload();
    } else {
      $('#modal-save').prop('disabled', false);
      $("#modal-file").prop("name", "document");
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