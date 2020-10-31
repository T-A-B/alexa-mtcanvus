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
const getUserMetadata = module.exports.getUserMetadata = async (accessToken) =>{
    try{
        const { data } = await axios.get('https://canvuscontrol.eu.auth0.com/userinfo/', {
            headers: {
                authorization: 'Bearer ' + accessToken,
            },
        });
        console.log('utils>USERDATA',data);
        
        const userdata = await axios.get(`https://canvuscontrol.eu.auth0.com/api/v2/users/${data.sub}`, {
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
    console.log('calling: ', `${userEnvData.canvus_server_IP_address}/api/v1/clients`);
    try{
        
        const clients = await axios.get(`${userEnvData.canvus_server_IP_address}/api/v1/clients`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        if (clients.data.length === 0){
            return {status:400, msg:"I couldn't find any client in the server"};
        }
        
        return clients.data;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't connect to the server. Check that you provided a valid ip address and token. You can re enable this skill to update these value.`};
    }
}

module.exports.getMTCanvusClientById = async (userEnvData) => {
    console.log('calling: ', `${userEnvData.canvus_server_IP_address}/api/v1/clients/${userEnvData.canvus_client_id}`);
    try{
        
        const client = await axios.get(`${userEnvData.canvus_server_IP_address}/api/v1/clients/${userEnvData.canvus_client_id}`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        if (client.data.msg){
            return {status:400, msg:"I couldn't find the default client in the server"};
        }
        
        client.data.status = 200;
        return client.data;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't connect to the server. Check that you provided a valid ip address and token. You can re enable this skill to update these value.`};
    }
}

module.exports.getMTCanvusClientWorkspaces = async (userEnvData, client_id) => {
    try{
        const workspaces = await axios.get(`${userEnvData.canvus_server_IP_address}/api/v1/clients/${client_id}/workspaces`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        if (workspaces.data.length === 0){
            return {status:400, msg:"I couldn't find any workspace for that client in the server"};
        }
        return workspaces.data;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't connect to the server. Check that you provided a valid ip address and token. You can re enable this skill to update these value.`};
    }
}

module.exports.getMTCanvusAlexaCanvases = async (userEnvData) => {
    console.log("calling:", `${userEnvData.canvus_server_IP_address}/api/v1/canvas-folders`);
    try{
        const canvasFolders = await axios.get(`${userEnvData.canvus_server_IP_address}/api/v1/canvas-folders`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        console.log("canvasFolders: ", `${JSON.stringify(canvasFolders.data)}`);
        //get canvasFolder with .name==Alexa
        const foundCanvasFolder = canvasFolders.data.find((canvas) => canvas.name === 'Alexa');
        
        if (!foundCanvasFolder){
            return {status:400, msg:`I couldn't find any canvas inside the Alexa folder. Please put the canvases you want to use inside a folder named Alexa and try again.`};
        }
        
        //get canvases with folder_id
        const canvases = await axios.get(`${userEnvData.canvus_server_IP_address}/api/v1/canvases`, {
            headers: {
                'Private-Token': userEnvData.canvus_API_auth_token,
            },
        });
        
        const alexaCanvases = canvases.data.filter((canvas) => canvas.folder_id === foundCanvasFolder.id);
        
        if (alexaCanvases.length === 0){
            return {status:400, msg:"I couldn't find any canvases in the server"};
        }
        
        return alexaCanvases;
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, msg: `Couldn't connect to the server. Check that you provided a valid ip address and token. You can re enable this skill to update these value.`};
    }
}

module.exports.patchMTCanvusClientWorkspace = async (userEnvData, client_id, workspace_index, canvas_id) => {
    try{
        const patchMTCanvusClientWorkspaceResult = await axios.patch(`${userEnvData.canvus_server_IP_address}/api/v1/clients/${client_id}/workspaces/${workspace_index}`, {
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
        return {status:400, msg: `Couldn't connect to the server. Check that you provided a valid ip address and token. You can re enable this skill to update these value.`};
    }
}

/*
SessionAttributes utils
*/
module.exports.checkSessionAttributes = async (handlerInput) => {
    try{
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        console.log('session',sessionAttributes);
        let accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
        console.log('accessToken',accessToken);
        if (Object.keys(sessionAttributes).length === 0 && sessionAttributes.constructor === Object){
            if (!accessToken){
                console.log('no access token');
                return {
                    status: 400,
                    response: handlerInput.responseBuilder
                        .speak('Your access token has expired, please re enable the skill to enter the data again')
                        .withLinkAccountCard()
                        .getResponse()
                }
            }
            console.log('getting user metadata');
            const getUserMetadataResponse = await getUserMetadata(accessToken);
            console.log('usermetadata: ',getUserMetadataResponse);
            sessionAttributes.canvus_server_IP_address = getUserMetadataResponse.data.user_metadata.canvus_server_IP_address;
            sessionAttributes.canvus_client_id = getUserMetadataResponse.data.user_metadata.canvus_client_id;
            sessionAttributes.canvus_API_auth_token = getUserMetadataResponse.data.user_metadata.canvus_API_auth_token;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        }
        console.log('checkSessionAttributes returning sessionAttributes: ',sessionAttributes);
        return {sessionAttributes: sessionAttributes, status:200};
    }catch(e){
        console.log('Error occurred: ', e);
        return {status:400, response: handlerInput.responseBuilder
                        .speak(`An error has occurred when accessing you account linking information.`)
                        .withLinkAccountCard()
                        .getResponse()};
    }
}