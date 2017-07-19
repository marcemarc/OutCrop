angular.module("umbraco").controller("Our.Umbraco.OutCropController", function ($scope, mediaResource, editorState,notificationsService) {
    var vm = this;
     // the crop functionality stolen from view: '/umbraco/views/propertyeditors/imagecropper/imagecropper.html',
    //===IMPROVEMENTS
    // Have some sort of watch on the chosen picker, so the button is only pressable when an image is picked
    // Add this to the core media picker - so it's an overlay of the picked image
    // ensure the targeted media picker is a single media picker, this version only work with single (think it will work on first item in multi picker list)
    // make sure we're targeting a media picker!
    // using the mediaResource to pull back images and save them - this requires user to have access to media section - could replace with entityResource.
    // positioning of the button? I've hacked some styles to position when label is turned off so it's closer to the picker - might be unpredictable!
    // should the button be hidden on small screens as you just can't do the cropping
    // finding the mediaPicker in the current editor state and finding the umbracoFile property on a media item is there a better way than looping through tabs and properties?
    // make all messages and text translatable
    //===
    $scope.model.hideLabel = $scope.model.config.hideLabel == 1;

    function init() {

        //check if umbracoFile provided
        if ($scope.model.config.filePropertyAlias === null || $scope.model.config.filePropertyAlias === "") {
            vm.status.umbracoFile.alias = "umbracoFile";
        }
        else {
            vm.status.umbracoFile.alias = $scope.model.config.filePropertyAlias;
        }
        // check if the associated media picker alias has been set
        if ($scope.model.config.pickerAlias === null || $scope.model.config.pickerAlias === "") {
            vm.status.statusMessage = 'Media Picker Alias needs to be set for the button';
        }
        else {
            vm.status.mediaPicker.alias = $scope.model.config.pickerAlias;
        }
        // check if the associated media picker exists
        var currentEditorState = editorState.getCurrent();
        //loop through all tabs, and all properties on hte current editor state looking for the picker
        // is this the best way to do this?
        angular.forEach(currentEditorState.tabs, function (tabValue, tabKey) {
            angular.forEach(tabValue.properties, function (propValue, propKey) {
                if (propValue.alias == vm.status.mediaPicker.alias) {
                    vm.status.mediaPicker.tabKey = tabKey;
                    vm.status.mediaPicker.propertyKey = propKey;
                    console.log(propValue);
                    vm.status.hasMediaPicker = true;            
                    vm.status.mediaPicker.editor = propValue.editor;
       
                    if (propValue.value.length > 0) {
                        // the id or uid will be saved as comma delimited string of picked items
                        // this function only makes sense for single pickers at the moment so always get first one
                        var id = propValue.value.split(',')[0];
                        console.log(id);
                        // do we need to do anything differently if it's a uid or id storage picker (apparently not but leaving this in anyway)
                        if (propValue.config.idType != null && propValue.config.idType === "udi") {
                            vm.status.mediaPicker.type = propValue.config.idType;
                        }
                        //set the id of the media item to use
                        vm.status.mediaId = id;
                        vm.overlay.mediaId = id;
                        vm.status.hasPickerPickedItem = true;
                        vm.status.showButton = true;
                        
                    }  
                }
            });
        });
        if (!vm.status.hasMediaPicker) {
            vm.status.statusMessage = "Media Picker missing with configured alias: " + vm.status.mediaPicker.alias;
        }
    };


    vm.status = {
        statusMessage: '',
        showButton: true,//essentially unless we can watch the picker value can't hide this when there is no image
        hasMediaPicker: false,
        hasPickedItem: false,
        hasPickerPickedItem: false,
        umbracoFile: {alias: 'umbracoFile', tabKey:-1,propertyKey:-1},
        mediaPicker: {alias: '', type:'id', tabKey:-1,propertyKey:-1,editor:''},
        mediaId: ''
    }
    vm.overlay = {
        mediaId: '', 
        saving:false,
        show:false,
        value: {},
        config: {},
         view: '/app_plugins/Our.Umbraco.OutCrop/cropper.html',
        close: function (oldModel) {
            vm.overlay.show = false;
        },
        title: 'Image Crops',
        submitButtonLabel: 'Save Crops',
        submit: function (model) {         
            vm.overlay.saving = true;
            //do savings
            //get media item again and replace it's umbradoFile value
            mediaResource.getById(vm.overlay.mediaId).then(function (media) {
                media.tabs[vm.status.umbracoFile.tabKey].properties[vm.status.umbracoFile.propertyKey].value = vm.overlay.value;
                    mediaResource.save(media, false, []).then(function (media) {
                        vm.overlay.saving = false;
                        vm.overlay.show = false;
                        notificationsService.remove(0);
                        notificationsService.success("The crops for '" + media.name + "' have been saved");

           });
    });
    
        }
    }

    vm.editCrops = editCrops;

    function setPickedMediaId(tabKey, propertyKey) {
  
        var id = '';
        var currentEditorState = editorState.getCurrent();
        var mediaPicker = currentEditorState.tabs[tabKey].properties[propertyKey];

        if (mediaPicker.value.length > 0) {
                        // the id or uid will be saved as comma delimited string of picked items
                        // this function only makes sense for single pickers at the moment so always get first one
                        id = mediaPicker.value.split(',')[0];
                        vm.status.mediaId = id;
                        vm.overlay.mediaId = id;
                        vm.status.hasPickerPickedItem = true;
                        vm.status.showButton = true;
        }
        else {
            vm.status.mediaId = '';
            vm.overlay.mediaId = '';
            vm.status.hasPickerPickedItem = false;
            // need to know when an image has been picked to implement this vm.status.showButton = false;

        }
        return vm.status.hasPickerPickedItem;
    }

    function editCrops() {
        vm.status.statusMessage = '';
        // get picked media id from picker
        //requires user to have access to media section
        // need to get details of picked property again in case a different image has been picked
        if (setPickedMediaId(vm.status.mediaPicker.tabKey, vm.status.mediaPicker.propertyKey)) {
            mediaResource.getById(vm.overlay.mediaId).then(function (ent) {
                //find umbracoFile is there a better way than this?
                angular.forEach(ent.tabs, function (tabValue, tabKey) {
                    angular.forEach(tabValue.properties, function (propValue, propKey) {
                        if (propValue.alias === vm.status.umbracoFile.alias) {
                            vm.status.umbracoFile.propertyKey = propKey;
                            vm.status.umbracoFile.tabKey = tabKey;
                            vm.overlay.value = propValue.value;
                            vm.overlay.config = propValue.config;
                            vm.overlay.show = true;
                            //break loop?
                        }
                    });
                });
            });
        }
        else {
            vm.status.statusMessage = 'No Media Item Picked to set crops on';
        }
     
    }

    init();

});