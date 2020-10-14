const AWS = require('aws-sdk');
const axios = require('axios');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4',
    region: process.env.S3_PERSISTENCE_REGION
});

module.exports.getS3PreSignedUrl = function getS3PreSignedUrl(s3ObjectKey) {

    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60*1 // the Expires is capped for 1 minute
    });
    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
    return s3PreSignedUrl;

}

/**
 * (AC) Helper method to get API request entity from the request envelope.
 */
module.exports.getApiArguments = (handlerInput) => {
    try {
        return handlerInput.requestEnvelope.request.apiRequest.arguments;
    } catch (e) {
        console.log('Error occurred: ', e);
        return false;
    }
}

/**
 * (AC) Helper method to get API resolved entity from the request envelope.
 */
module.exports.getApiSlots = (handlerInput) => {
    try {
        return handlerInput.requestEnvelope.request.apiRequest.slots;
    } catch (e) {
        console.log('Error occurred: ', e);
        return false;
    }
}

/*
Auth0 methods
*/
module.exports.getUserMetadata = async (accessToken) =>{
    try{
        const { data } = await axios.get('https://mtcanvus-user.us.auth0.com/userinfo/', {
            headers: {
                authorization: 'Bearer ' + accessToken,
            },
        });
        console.log('utils>USERDATA',data);
        
        const userdata = await axios.get(`https://mtcanvus-user.us.auth0.com/api/v2/users/${data.sub}`, {
            headers: {
                authorization: 'Bearer ' + accessToken,
            },
        });
        console.log('utils>Userdata',userdata);
        return userdata;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:e};
    }
}

/*
MTCanvus API methods
*/
module.exports.getMTCanvusClients = async (userEnvData) => {
    //userEnvData.canvus_server_IP_address, e.g., canvus.example.com
    //userEnvData.canvus_client_id
    //userEnvData.canvus_API_auth_token
    try{
        
        const clients = await axios.get(`https://${userEnvData.canvus_server_IP_address}/api/v1/clients`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        return clients;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't establish connection to ${userEnvData.canvus_server_IP_address}. Check that this is the correct server IP address. You can re enable this skill to update this value.`};
    }
}

module.exports.getMTCanvusClientWorkspaces = async (userEnvData, client_id) => {
    try{
        const workspaces = await axios.get(`https://${userEnvData.canvus_server_IP_address}/api/v1/clients/${client_id}/workspaces`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        return workspaces;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't establish connection to ${userEnvData.canvus_server_IP_address}. Check that this is the correct server IP address. You can re enable this skill to update this value.`};
    }
}

module.exports.getMTCanvusAlexaCanvases = async (userEnvData) => {
    try{
        const canvasFolders = await axios.get(`https://${userEnvData.canvus_server_IP_address}/api/v1/canvas-folders`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        //get canvasFolder with .name==Alexa
        const foundCanvasFolder = canvasFolders.find((canvas) => canvas.name === 'Alexa');
        
        //get canvases with folder_id
        const canvases = await axios.get(`https://${userEnvData.canvus_server_IP_address}/api/v1/canvases`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        const alexaCanvases = canvases.filter((canvas) => canvas.folder_id === foundCanvasFolder.folder_id);
        
        return alexaCanvases;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't establish connection to ${userEnvData.canvus_server_IP_address}. Check that this is the correct server IP address. You can re enable this skill to update this value.`};
    }
}

module.exports.patchMTCanvusClientWorkspace = async (userEnvData, client_id, workspace_index, canvas_id) => {
    try{
        const patchMTCanvusClientWorkspaceResult = await axios.patch(`https://${userEnvData.canvus_server_IP_address}/api/v1/clients/${client_id}/workspaces/${workspace_index}`, {
            'canvas_id': canvas_id
        }, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        console.log('patchMTCanvusClientWorkspaceResult: ', patchMTCanvusClientWorkspaceResult);
        patchMTCanvusClientWorkspaceResult.status = 200;
        return patchMTCanvusClientWorkspaceResult;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't establish connection to ${userEnvData.canvus_server_IP_address}. Check that this is the correct server IP address. You can re enable this skill to update this value.`};
    }
}