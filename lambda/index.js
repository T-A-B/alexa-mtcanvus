/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const Auth0 = require('auth0-js');
const axios = require('axios');
const util = require('./util');

let auth0Management;
let auth0Authentication;
let auth0WebAuth;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        let speakOutput = 'Welcome. You can ask me to show your clients, your workspaces and your canvases, or to load a canvas on a client, workspace or all clients';
        console.log('preacces token');
        let accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
        console.log('ACCESS TOKEN: ', accessToken);
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        if (!accessToken){
            return handlerInput.responseBuilder
                .speak('Your access token has expired, please re enable the skill to enter the data again')
                .withLinkAccountCard()
                .getResponse();
        }
        
        /*
        auth0WebAuth = new Auth0.WebAuth({
            domain: 'mtcanvus-user.us.auth0.com',
            clientID: 'bq2LhI49JvMysMcLkXeY3kKsXjrHqPEW',
            audience: 'https%3A%2F%2Fmtcanvus-user.us.auth0.com%2Fapi%2Fv2%2F',
            scope: 'read:current_user'
        });
        
        auth0Management = new Auth0.Management({
          domain: 'mtcanvus-user.us.auth0.com',
          token: accessToken
        });
        console.log('Launch Management: ',auth0Management);
        */
        
        const getUserMetadataResponse = await util.getUserMetadata(accessToken);
        console.log('user metadata: ',getUserMetadataResponse.data.user_metadata);
        
        sessionAttributes.canvus_server_IP_address = getUserMetadataResponse.data.user_metadata.canvus_server_IP_address;
        sessionAttributes.canvus_client_id = getUserMetadataResponse.data.user_metadata.canvus_client_id;
        sessionAttributes.canvus_API_auth_token = getUserMetadataResponse.data.user_metadata.canvus_API_auth_token;
        
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        console.log('session attributes: ', sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const UnlinkAccountIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'UnlinkAccountIntent';
    },
    async handle(handlerInput) {
        const speakOutput = 'Please go to account linking and re enter your canvus data';
        
        
        //goto that url GET
        //let {data} = await axios.get(url);
        //console.log('LOGOUT RESPONSE: ',data);
        
        /*
        try{
            let someresp = auth0WebAuth.logout({
                client_id: 'bq2LhI49JvMysMcLkXeY3kKsXjrHqPEW',
                federated: true
              });
              
             console.log(someresp);
        }catch(err){
            console.log(err);
        }
        */
        

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const ShowClientWorkspacesHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ShowClientWorkspaces';
    },
    async handle(handlerInput) {
        const slots = Alexa.getSlot(handlerInput.requestEnvelope, 'clientNumber');
        const clientNumber = slots.value;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let foundClient = null;
        
        let speakOutput = `These are client ${clientNumber} workspaces.`;
        let workspaceList = "";
        let clientList = "";
        let clientIndexList = "";
        
        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED'){
            return handlerInput.responseBuilder
                .speak("Okay. Tell me if there is something else you need or say stop to end the session.")
                //.reprompt('')
                .withShouldEndSession(false)
                .getResponse();
        }
        
        //get clients if not already
        if (!sessionAttributes.clients){
            const getMTCanvusClientsResponse = await util.getMTCanvusClients(sessionAttributes);
            /*
            const getMTCanvusClientsResponse = [
  {
    "access": "rw",
    "id": "4dc1eba7-3788-4fd3-b909-e2cdf018e50b",
    "installation_name": "igor-pc",
    "state": "normal",
    "version": "2.7.1 [28f1b0e05]"
  }
];
*/
            sessionAttributes.clients = getMTCanvusClientsResponse;
        }
        
        if (sessionAttributes.clients.status === 400){
            return handlerInput.responseBuilder
                .speak(`${sessionAttributes.clients.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        
        sessionAttributes.clients.map((client, i) => {
            clientList += ` ${i}, ${client.installation_name}.`;
        });
        
        //get client_id from input client index
        foundClient = sessionAttributes.clients[clientNumber];
        
        //example client_id = 4dc1eba7-3788-4fd3-b909-e2cdf018e50b
        if (foundClient){
            speakOutput = `These are ${foundClient.installation_name} workspaces.`
            
            const workspaces = await util.getMTCanvusClientWorkspaces(sessionAttributes, foundClient.id);
            /*
            const workspaces = [
  {
    "canvas_id": "f1a30b39-74d6-46dd-bbb1-a4236d09362e",
    "canvas_size": {
      "height": 5400,
      "width": 9600
    },
    "index": 0,
    "info_panel_visible": true,
    "location": {
      "x": 0,
      "y": 0
    },
    "pinned": false,
    "size": {
      "height": 864,
      "width": 750
    },
    "state": "normal",
    "view_rectangle": {
      "height": 864,
      "width": 750,
      "x": 4032,
      "y": 2268
    },
    "workspace_name": "Workspace 1"
  },
  {
    "canvas_id": "a5739954-95da-4d97-ad46-4886c137a791",
    "canvas_size": {
      "height": 5400,
      "width": 9600
    },
    "index": 1,
    "info_panel_visible": true,
    "location": {
      "x": 750,
      "y": 0
    },
    "pinned": false,
    "size": {
      "height": 864,
      "width": 786
    },
    "state": "normal",
    "view_rectangle": {
      "height": 1800,
      "width": 1637.5,
      "x": 3981.25,
      "y": 1800
    },
    "workspace_name": "Workspace 2"
  }
];
*/
            
            console.log('retrieved workspaces: ',workspaces);
            if (workspaces.status === 400){
                return handlerInput.responseBuilder
                    .speak(`${workspaces.msg}`)
                    .withShouldEndSession(true)
                    .getResponse();
            }
            workspaces.map((workspace, i) => {
                workspaceList += ` ${workspace.index}, ${workspace.workspace_name}.`;
            });
            speakOutput += workspaceList;
        }else{
            return handlerInput.responseBuilder
                .speak(`Sorry, ${clientNumber} is not a valid client index. Valid clients are ${clientList} Say the number of the client whose workspace you want.`)
                .reprompt(`None of the clients match the index you provided. Valid clients are ${clientList} Say the number of the client whose workspace you want.`)
                .addElicitSlotDirective('clientNumber')
                .getResponse();
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const ShowClientsHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ShowClients';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput = 'These are the clients.';
        
        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED'){
            return handlerInput.responseBuilder
                .speak("Okay. Tell me if there is something else you need or say stop to end the session.")
                //.reprompt('')
                .withShouldEndSession(false)
                .getResponse();
        }
        
        //call get all clients
        const clients = await util.getMTCanvusClients(sessionAttributes);
        /*
        const clients = [
  {
    "access": "rw",
    "id": "4dc1eba7-3788-4fd3-b909-e2cdf018e50b",
    "installation_name": "igor-pc",
    "state": "normal",
    "version": "2.7.1 [28f1b0e05]"
  }
];
*/
        if (clients.status === 400){
            return handlerInput.responseBuilder
                .speak(`${clients.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        
        console.log('retrieved clients: ',clients);
        clients.map((client, i) => {
            speakOutput += ` ${i}, ${client.installation_name}.`;
        });
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const ShowCanvasesHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ShowCanvases';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput = 'These are your canvases.';
        
        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED'){
            return handlerInput.responseBuilder
                .speak("Okay. Tell me if there is something else you need or say stop to end the session.")
                //.reprompt('')
                .withShouldEndSession(false)
                .getResponse();
        }
        
        const alexaCanvases = await util.getMTCanvusAlexaCanvases(sessionAttributes);
        /*
        const alexaCanvases = [
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "e154a7c3-ffbf-4602-ac6b-e319706cd902",
    "name": "New canvas",
    "state": "normal"
  },
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "5615d165-44b1-4772-805e-7f1344639ba7",
    "name": "New canvas (1)",
    "state": "normal"
  }
];
*/
        
        console.log('retrieved canvases: ',alexaCanvases);
        if (alexaCanvases.status === 400){
            return handlerInput.responseBuilder
                .speak(`${alexaCanvases.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        alexaCanvases.map((alexaCanvas, i) => {
            speakOutput += ` ${i}, ${alexaCanvas.name}.`;
        });
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const LoadCanvasOnClientWorkspaceHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LoadCanvasOnClientWorkspace';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const clientNumberSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'clientNumber');
        const workspaceNumberSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'workspaceNumber');
        const canvasNumberSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'canvasNumber');
        const clientNumber = clientNumberSlot.value;
        const workspaceNumber = workspaceNumberSlot.value;
        const canvasNumber = canvasNumberSlot.value;
        
        let foundClient = null;
        let foundWorkspace = null;
        let foundCanvas = null;
        let speakOutput;
        let clientList = "";
        let workspaceList = "";
        let canvasList = "";
        
        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED'){
            return handlerInput.responseBuilder
                .speak("Okay. Tell me if there is something else you need or say stop to end the session.")
                //.reprompt('')
                .withShouldEndSession(false)
                .getResponse();
        }
        
        console.log('LoadCanvasOnClientHandler: ', `Loading canvas ${canvasNumber} on client ${clientNumber} workspace ${workspaceNumber}`)
        //get clients
        const clients = await util.getMTCanvusClients(sessionAttributes);
        /*
        const clients = [
  {
    "access": "rw",
    "id": "4dc1eba7-3788-4fd3-b909-e2cdf018e50b",
    "installation_name": "igor-pc",
    "state": "normal",
    "version": "2.7.1 [28f1b0e05]"
  }
];
*/
        console.log('retrieved clients: ',clients);
        if (clients.status === 400){
            return handlerInput.responseBuilder
                .speak(`${clients.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        clients.map((client, i) => {
            clientList += ` ${i}, ${client.installation_name}.`;
        });
        //check client index
        foundClient = clients[clientNumber];
        
        if (!foundClient){
            return handlerInput.responseBuilder
                .speak(`Sorry, ${clientNumber} is not a valid client index. Valid clients are ${clientList} Say the number of the client you want to load the canvas on.`)
                .reprompt(`None of the clients match the index you provided. Valid clients are ${clientList} Say the number of the client you want to load the canvas on.`)
                .addElicitSlotDirective('clientNumber')
                .getResponse();
        }
        
        //get client's workspace
        const workspaces = await util.getMTCanvusClientWorkspaces(sessionAttributes, foundClient.id);
        /*
        const workspaces = [
  {
    "canvas_id": "f1a30b39-74d6-46dd-bbb1-a4236d09362e",
    "canvas_size": {
      "height": 5400,
      "width": 9600
    },
    "index": 0,
    "info_panel_visible": true,
    "location": {
      "x": 0,
      "y": 0
    },
    "pinned": false,
    "size": {
      "height": 864,
      "width": 750
    },
    "state": "normal",
    "view_rectangle": {
      "height": 864,
      "width": 750,
      "x": 4032,
      "y": 2268
    },
    "workspace_name": "Workspace 1"
  },
  {
    "canvas_id": "a5739954-95da-4d97-ad46-4886c137a791",
    "canvas_size": {
      "height": 5400,
      "width": 9600
    },
    "index": 1,
    "info_panel_visible": true,
    "location": {
      "x": 750,
      "y": 0
    },
    "pinned": false,
    "size": {
      "height": 864,
      "width": 786
    },
    "state": "normal",
    "view_rectangle": {
      "height": 1800,
      "width": 1637.5,
      "x": 3981.25,
      "y": 1800
    },
    "workspace_name": "Workspace 2"
  }
];
*/
        console.log('retrieved workspaces: ',workspaces);
        if (workspaces.status === 400){
            return handlerInput.responseBuilder
                .speak(`${workspaces.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        workspaces.map((workspace, i) => {
            workspaceList += ` ${workspace.index}, ${workspace.workspace_name}.`;
        });
        //check workspace index
        foundWorkspace = workspaces[workspaceNumber];
        if (!foundWorkspace){
            return handlerInput.responseBuilder
                .speak(`Sorry, ${workspaceNumber} is not a valid workspace index. Valid workspaces are ${workspaceList} Say the number of the workspace you want to load the canvas on.`)
                .reprompt(`None of the workspaces match the index you provided. Valid workspaces are ${workspaceList} Say the number of the workspace you want to load the canvas on.`)
                .addElicitSlotDirective('workspaceNumber')
                .getResponse();
        }
        
        //get alexa canvases
        const canvases = await util.getMTCanvusAlexaCanvases(sessionAttributes);
        /*
        const canvases = [
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "e154a7c3-ffbf-4602-ac6b-e319706cd902",
    "name": "New canvas",
    "state": "normal"
  },
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "5615d165-44b1-4772-805e-7f1344639ba7",
    "name": "New canvas (1)",
    "state": "normal"
  }
];
*/
        console.log('retrieved canvases: ',canvases);
        if (canvases.status === 400){
            return handlerInput.responseBuilder
                .speak(`${canvases.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        canvases.map((canvas, i) => {
            canvasList += ` ${i}, ${canvas.name}.`;
        });
        //check canvas index existance
        foundCanvas = canvases[canvasNumber];
        if (!foundCanvas){
            return handlerInput.responseBuilder
                .speak(`Sorry, ${canvasNumber} is not a valid canvas index. Valid canvases are ${canvasList} Say the number of the canvas you want to load.`)
                .reprompt(`None of the canvases match the index you provided. Valid canvases are ${canvasList} Say the number of the canvas you want to load.`)
                .addElicitSlotDirective('canvasNumber')
                .getResponse();
        }
        
        
        //patch patchMTCanvusClientWorkspace
        const updatedWorkspace = await util.patchMTCanvusClientWorkspace(sessionAttributes, foundClient.id, foundWorkspace.index, foundCanvas.id);
        //const updatedWorkspace = {status: 200};
        console.log(`..updating workspace ${foundWorkspace.index} client ${foundClient.id} with ${foundCanvas.id}`);
        
        console.log('retrieved updatedWorkspace: ',updatedWorkspace);
        
        if (updatedWorkspace.status === 200){
            speakOutput = `Canvas ${foundCanvas.name} has been loaded on client ${foundClient.installation_name} on workspace ${foundWorkspace.workspace_name}.`;
        }else{
            speakOutput = `There was an error while updating the workspace`;
        }
        

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const LoadCanvasOnClientHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LoadCanvasOnClient';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const clientNumberSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'clientNumber');
        const canvasNumberSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'canvasNumber');
        const clientNumber = clientNumberSlot.value;
        const canvasNumber = canvasNumberSlot.value;
        
        let foundClient = null;
        let foundCanvas = null;
        let clientList = "";
        let canvasList = "";
        
        let speakOutput;
        
        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED'){
            return handlerInput.responseBuilder
                .speak("Okay. Tell me if there is something else you need or say stop to end the session.")
                //.reprompt('')
                .withShouldEndSession(false)
                .getResponse();
        }
        
        //get clients
        const clients = await util.getMTCanvusClients(sessionAttributes);
        /*
        const clients = [
  {
    "access": "rw",
    "id": "4dc1eba7-3788-4fd3-b909-e2cdf018e50b",
    "installation_name": "igor-pc",
    "state": "normal",
    "version": "2.7.1 [28f1b0e05]"
  }
];
*/
        console.log('retrieved clients: ',clients);
        if (clients.status === 400){
            return handlerInput.responseBuilder
                .speak(`${clients.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        clients.map((client, i) => {
            clientList += ` ${i}, ${client.installation_name}.`;
        });
        //check client index
        foundClient = clients[clientNumber];
        if (!foundClient){
            return handlerInput.responseBuilder
                .speak(`Sorry, ${clientNumber} is not a valid client index. Valid clients are ${clientList} Say the number of the client you want to load the canvas on.`)
                .reprompt(`None of the clients match the index you provided. Valid client are ${clientList} Say the number of the client you want to load.`)
                .addElicitSlotDirective('clientNumber')
                .getResponse();
        }
        
        //get alexa canvases
        const canvases = await util.getMTCanvusAlexaCanvases(sessionAttributes);
        /*
        const canvases = [
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "e154a7c3-ffbf-4602-ac6b-e319706cd902",
    "name": "New canvas",
    "state": "normal"
  },
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "5615d165-44b1-4772-805e-7f1344639ba7",
    "name": "New canvas (1)",
    "state": "normal"
  }
];
*/
        console.log('retrieved canvases: ',canvases);
        if (canvases.status === 400){
            return handlerInput.responseBuilder
                .speak(`${canvases.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        canvases.map((canvas, i) => {
            canvasList += ` ${i}, ${canvas.name}.`;
        });
        //check canvas index existance
        foundCanvas = canvases[canvasNumber];
        if (!foundCanvas){
            return handlerInput.responseBuilder
                .speak(`Sorry, ${canvasNumber} is not a valid canvas index. Valid canvases are ${canvasList} Say the number of the canvas you want to load.`)
                .reprompt(`None of the canvases match the index you provided. Valid canvases are ${canvasList} Say the number of the canvas you want to load.`)
                .addElicitSlotDirective('canvasNumber')
                .getResponse();
        }
        
        //patch with workspace 0.
        const updatedWorkspace = await util.patchMTCanvusClientWorkspace(sessionAttributes, foundClient.id, 0, foundCanvas.id);
        //const updatedWorkspace = {status: 200};
        console.log(`..updating client ${foundClient.id} with ${foundCanvas.id}`);
        console.log('retrieved updatedWorkspace: ',updatedWorkspace);
        
        if (updatedWorkspace.status === 200){
            speakOutput = `Canvas ${foundCanvas.name} has been loaded on client ${foundClient.installation_name}.`;
        }else{
            speakOutput = `There was an error while updating the workspace`;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const LoadCanvasAllHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LoadCanvasAll';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        const canvasNumberSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'canvasNumber');
        const canvasNumber = canvasNumberSlot.value;
        let foundCanvas = null;
        let canvasList = "";
        
        let speakOutput;
        
        let updatedWorkspace
        let errorCount = 0;
        
        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED'){
            return handlerInput.responseBuilder
                .speak("Okay. Tell me if there is something else you need or say stop to end the session.")
                //.reprompt('')
                .withShouldEndSession(false)
                .getResponse();
        }
        
        //get client list.
        const clients = await util.getMTCanvusClients(sessionAttributes);
        /*
        const clients = [
  {
    "access": "rw",
    "id": "4dc1eba7-3788-4fd3-b909-e2cdf018e50b",
    "installation_name": "igor-pc",
    "state": "normal",
    "version": "2.7.1 [28f1b0e05]"
  }
];
*/
        console.log('retrieved clients: ',clients);
        if (clients.status === 400){
            return handlerInput.responseBuilder
                .speak(`${clients.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        
        //get alexa canvases
        const canvases = await util.getMTCanvusAlexaCanvases(sessionAttributes);
        /*
        const canvases = [
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "e154a7c3-ffbf-4602-ac6b-e319706cd902",
    "name": "New canvas",
    "state": "normal"
  },
  {
    "folder_id": "83af78c8-65a3-41d0-9873-916e4adc0ea4",
    "id": "5615d165-44b1-4772-805e-7f1344639ba7",
    "name": "New canvas (1)",
    "state": "normal"
  }
];
*/
        console.log('retrieved canvases: ',canvases);
        if (canvases.status === 400){
            return handlerInput.responseBuilder
                .speak(`${canvases.msg}`)
                .withShouldEndSession(true)
                .getResponse();
        }
        canvases.map((canvas, i) => {
            canvasList += ` ${i}, ${canvas.name}.`;
        });
        //check canvas index existance
        foundCanvas = canvases[canvasNumber];
        if (!foundCanvas){
            return handlerInput.responseBuilder
                .speak(`Sorry, ${canvasNumber} is not a valid canvas index. Valid canvases are ${canvasList} Say the number of the canvas you want to load.`)
                .reprompt(`None of the canvases match the index you provided. Valid canvases are ${canvasList} Say the number of the canvas you want to load.`)
                .addElicitSlotDirective('canvasNumber')
                .getResponse();
        }
        
        //loop through clients and make patch request with workspace 0
        for (let index = 0; index < clients.length; index++) {
            updatedWorkspace = await util.patchMTCanvusClientWorkspace(sessionAttributes, clients[index].id, 0, foundCanvas.id);
            //updatedWorkspace = {status:200};
            console.log(`..updating client ${clients[index].id} with ${foundCanvas.id}`);
            console.log('retrieved updatedWorkspace: ',updatedWorkspace);
            
            if (updatedWorkspace.status === 400){
                errorCount += 1;
            }
        }
        
        if (errorCount > 0){
            speakOutput = `There was an error while updating ${errorCount} workspaces`;
        }else{
            speakOutput = `Canvas ${foundCanvas.name} has been successfully loaded on all clients.`;
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello! You can ask me to show your clients, your workspaces and your canvases, or to load a canvas on a client, workspace or all clients';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .withShouldEndSession(false)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        UnlinkAccountIntentHandler,
        ShowClientWorkspacesHandler,
        ShowClientsHandler,
        ShowCanvasesHandler,
        LoadCanvasOnClientWorkspaceHandler,
        LoadCanvasOnClientHandler,
        LoadCanvasAllHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .lambda();