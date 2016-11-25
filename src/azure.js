var msRestAzure = require('ms-rest-azure');
var WebSiteManagement = require('azure-arm-website');
var ResourceManagement = require('azure-arm-resource');
var StorageManagement = require('azure-arm-storage');
var SubscriptionClient = require('azure-arm-resource').SubscriptionClient;
var AzureGallery = require('azure-gallery');
var config = require('./config');
var constants = config.getConstants();

exports.createWebApp = function createWebApp(state) {
    return createAppService(state);
};

exports.createFunction = function createFunction(state) {
    return createAppService(state, 'functionapp');
};

exports.createNewResourceGroup = function createNewResourceGroup(state) {
    return new Promise(function (resolve, reject) {
        var resourceClient = new ResourceManagement.ResourceManagementClient(state.credentials, state.selectedSubscriptionId);
        resourceClient.resourceGroups.createOrUpdate(state.resourceGroupToUse, {
            location: state.selectedRegion // todo: enable user selection
        }, function (err, result) {
            if (err != null) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
};

exports.createNewServerFarm = function createNewServerFarm(state) {
    return new Promise(function (resolve, reject) {
        var webSiteManagement = new WebSiteManagement(state.credentials, state.selectedSubscriptionId);
        var planParameters = {
            serverFarmWithRichSkuName: state.selectedServerFarm,
            location: state.selectedRegion,
            sku: {
                name: 'F1',
                capacity: 1,
                tier: 'Free'
            }
        };
        webSiteManagement.serverFarms.createOrUpdateServerFarm(
            state.resourceGroupToUse,
            state.selectedServerFarm,
            planParameters,
            function (err, result) {
                if (err != null)
                    reject(err);
                else {
                    resolve(result);
                }
            }
        );
    });
};

exports.getServerFarms = function getServerFarms(state) {
    return new Promise(function (resolve, reject) {
        var resourceClient = new ResourceManagement.ResourceManagementClient(state.credentials, state.selectedSubscriptionId);
        resourceClient.resources.list({
            filter: "resourceType eq 'Microsoft.Web/serverfarms' and resourceGroup eq '" + state.resourceGroupToUse + "'"
        }, function (err, result) {
            if (err != null)
                reject(err);
            else {
                resolve(result);
            }
        });
    });
};

exports.getResourceGroups = function getResourceGroups(state) {
    return new Promise(function (resolve, reject) {
        var resourceClient = new ResourceManagement.ResourceManagementClient(state.credentials, state.selectedSubscriptionId);
        state.resourceGroupList = [];
        resourceClient.resourceGroups.list(function (err, result) {
            if (err != null)
                reject(err);
            else {
                resolve(result);
            }
        })
    });
};

exports.checkSiteNameAvailability = function checkSiteNameAvailability(state) {
    return new Promise(function (resolve, reject) {
        var webSiteManagement = new WebSiteManagement(state.credentials, state.selectedSubscriptionId);
        webSiteManagement.global.checkNameAvailability({
            name: state.newWebAppName,
            type: 'Microsoft.Web/sites'
        }, function (err, result) {
            if (err != null)
                reject(err);
            else {
                resolve(result);
            }
        });
    });
};

exports.getFullResourceList = function getFullResourceList(state) {
    return new Promise(function (resolve, reject) {
        var resourceClient = new ResourceManagement.ResourceManagementClient(state.credentials, state.selectedSubscriptionId);
        resourceClient.resources.list(function (err, result) {
            if (err != null)
                reject(err);
            else {
                state.entireResourceList = result;
                names = state.entireResourceList.map(function (resource) {
                    return resource.id.replace('subscriptions/' + state.selectedSubscriptionId + '/resourceGroups/', '');
                });
                resolve(names);
            }
        });
    });
};

exports.getRegions = function getRegions(state) {
    return new Promise(function (resolve, reject) {
        var resourceClient = new ResourceManagement.ResourceManagementClient(state.credentials, state.selectedSubscriptionId);
        var subscriptionClient = new SubscriptionClient(state.credentials);
        subscriptionClient.subscriptions.listLocations(state.selectedSubscriptionId, function (err, result) {
            if (err != null)
                reject(err);
            else {
                resolve(result);
            }
        });
    });
};

exports.getStorageAccounts = function getStorageAccounts(state) {
    return new Promise(function (resolve, reject) {
        var storageClient = new StorageManagement(state.credentials, state.selectedSubscriptionId);
        storageClient.storageAccounts.list(function (err, result) {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
};

exports.checkStorageAccountNameAvailability = (state) => {
    return new Promise((resolve, reject) => {
        var storageClient = new StorageManagement(state.credentials, state.selectedSubscriptionId);
        storageClient.storageAccounts.checkNameAvailability(
        state.selectedStorageAccount, 
        (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    })
}

exports.createStorageAccount = function createStorageAccount(state) {
    return new Promise((resolve, reject) => {
        var storageClient = new StorageManagement(state.credentials, state.selectedSubscriptionId);
        var createParameters = {
            location: state.selectedRegion,
            sku: {
                name: 'Standard_LRS'
            },
            kind: 'Storage'
        };
        
        storageClient.storageAccounts.create(
            state.resourceGroupToUse, 
            state.selectedStorageAccount, 
            createParameters, 
            (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
        
    });
};

exports.getStorageAccountKeys = function getStorageAccountKeys(state) {
    return new Promise((resolve, reject) => {
        var storageClient = new StorageManagement(state.credentials, state.selectedSubscriptionId);
        storageClient.storageAccounts.listKeys(state.resourceGroupToUse, state.selectedStorageAccount, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
};

exports.searchArmGallery = (state) => {
    return new Promise((resolve, reject) => {
        var galleryClient = AzureGallery.createGalleryClient(state.credentials);
        galleryClient.items.list(null, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

exports.getArmTemplateFromGallery = (state) => {
    return new Promise((resolve, reject) => {
        var galleryClient = AzureGallery.createGalleryClient(state.credentials);
        galleryClient.items.get(state.AzureGalleryItemId, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

function createAppService(state, kind) {
    return new Promise(function (resolve, reject) {
        var config = {
            location: state.selectedRegion,
            serverFarmId: state.selectedServerFarm
        };

        // doc: "kind" is how we determine what type of app service we're creating
        if (kind) {
            config.kind = kind; 
        }
        
        var webSiteManagement = new WebSiteManagement(state.credentials, state.selectedSubscriptionId);
        webSiteManagement.sites.createOrUpdateSite(state.resourceGroupToUse,
            state.newWebAppName,
            config,
            function (err, result) {
                if (err != null) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
    });
};