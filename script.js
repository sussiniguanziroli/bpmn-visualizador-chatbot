function customAlert(title, message) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.remove('hidden');
    modal.classList.add('flex'); 
}

document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('custom-modal').classList.add('hidden');
    document.getElementById('custom-modal').classList.remove('flex');
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('custom-modal');
    if (event.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
});

const BpmnViewer = window.BpmnJS;
const viewer = new BpmnViewer({
    container: '#diagram-viewer',
    keyboard: {
        bindTo: document
    }
});

const bpmnXmlInput = document.getElementById('bpmn-xml-input');
const loadBpmnBtn = document.getElementById('load-bpmn-btn');

const chatMessagesDiv = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const startChatButton = document.getElementById('start-chat-btn');

let bpmnProcess = null; 
let elements = {}; 
let currentElement = null; 
let isChatActive = false;
let lastHighlightedElementId = null; 

function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'bot') {
        messageDiv.classList.add('bot-message');
    } else {
        messageDiv.classList.add('user-message');
    }
    messageDiv.textContent = text;
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; 
}

function highlightElement(elementId) {
    const canvas = viewer.get('canvas');
    if (lastHighlightedElementId) {
        canvas.removeMarker(lastHighlightedElementId, 'highlight');
    }
    canvas.addMarker(elementId, 'highlight');
    lastHighlightedElementId = elementId;
}

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

async function parseBPMN(xml) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const bpmnNamespace = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        console.error('Error de DOMParser:', parseError.textContent);
        customAlert('Error de Análisis BPMN', `Estructura XML inválida detectada: ${parseError.textContent}`);
        return null;
    }

    const processes = Array.from(xmlDoc.getElementsByTagNameNS(bpmnNamespace, 'process')); 
    let mainProcess = null;
    for (let i = 0; i < processes.length; i++) {
        if (processes[i].id === 'Id_b543bcf9-bb89-4954-ba10-fbb923190678') { 
            mainProcess = processes[i];
            break;
        }
    }

    if (!mainProcess) {
        customAlert('Error de Análisis', 'El proceso BPMN especificado (ID: Id_b543bcf9-bb89-4954-ba10-fbb923190678) no se encontró en el XML.');
        return null;
    }

    const parsedElements = {};

    const elementTypes = [
        'startEvent', 'task', 'exclusiveGateway', 'endEvent', 'subProcess',
        'intermediateThrowEvent', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway'
    ]; 
    elementTypes.forEach(type => {
        Array.from(xmlDoc.getElementsByTagNameNS(bpmnNamespace, type)).forEach(el => { 
            if (el.id) {
                parsedElements[el.id] = {
                    id: el.id,
                    name: el.getAttribute('name') || '', 
                    type: el.localName,
                    outgoing: [],
                    incoming: []
                };
            }
        });
    });

    Array.from(xmlDoc.getElementsByTagNameNS(bpmnNamespace, 'sequenceFlow')).forEach(flow => { 
        const sourceRef = flow.getAttribute('sourceRef');
        const targetRef = flow.getAttribute('targetRef');
        const flowName = flow.getAttribute('name') || ''; 

        if (parsedElements[sourceRef]) {
            parsedElements[sourceRef].outgoing.push({ id: flow.id, target: targetRef, name: flowName });
        }
        if (parsedElements[targetRef]) {
            parsedElements[targetRef].incoming.push({ id: flow.id, source: sourceRef, name: flowName });
        }
    });

    return { process: mainProcess, elements: parsedElements };
}

async function proceedChat(userInputText = '') {
    if (!currentElement) {
        customAlert('Error de Chat', 'Proceso de chat no inicializado o completado.');
        endChat();
        return;
    }

    highlightElement(currentElement.id);

    let botMessage = '';
    let nextElementId = null;
    let expectsUserInput = false;
    let choices = []; 

    switch (currentElement.type) {
        case 'startEvent':
            botMessage = `¡Hola! Soy un chatbot para el seguimiento de encomiendas internacionales. ¿Qué desea realizar?`;
            nextElementId = currentElement.outgoing[0]?.target;
            break;

        case 'task':
        case 'subProcess':
            botMessage = `Estamos en el paso: "${currentElement.name}".`;

            if (currentElement.outgoing.length > 1 || (currentElement.name && currentElement.name.includes('?'))) {

                botMessage += ` Por favor, responda lo que se le solicita o elija una opción si se le presenta.`;
                expectsUserInput = true;
                choices = currentElement.outgoing.map(flow => flow.name.toLowerCase()).filter(name => name);
                if (choices.length === 0) choices = ['sí', 'no']; 
            } else if (currentElement.outgoing.length > 0) {
                nextElementId = currentElement.outgoing[0]?.target;
            } else {
                botMessage += ` Parece que esta tarea no tiene una continuación definida.`;
                endChat();
                return;
            }
            break;

        case 'exclusiveGateway':
            botMessage = `Estamos en una decisión en "${currentElement.name}".`;
            expectsUserInput = true;
            choices = currentElement.outgoing.map(flow => flow.name.toLowerCase()).filter(name => name);
            if (choices.length > 0) {
                botMessage += ` Por favor, elija: ${choices.join(' o ')}.`;
            } else {
                botMessage += " Por favor, escriba 'sí' o 'no' para continuar.";
                choices = ['sí', 'no'];
            }
            break;

        case 'parallelGateway': 
            botMessage = `Hemos llegado a una compuerta paralela "${currentElement.name}". Esto significa que múltiples actividades pueden ocurrir simultáneamente.`;

            const randomParallelFlow = getRandomElement(currentElement.outgoing);
            if (randomParallelFlow) {
                addMessage('bot', `Simulando una de las ramas paralelas: "${elements[randomParallelFlow.target].name}".`);
                nextElementId = randomParallelFlow.target;
            } else {
                botMessage += ` No se encontraron ramas de salida para la compuerta paralela.`;
                endChat();
                return;
            }
            break;

        case 'inclusiveGateway': 
            botMessage = `Hemos llegado a una compuerta inclusiva "${currentElement.name}". Esto permite una o varias rutas.`;

            const randomInclusiveFlow = getRandomElement(currentElement.outgoing);
            if (randomInclusiveFlow) {
                addMessage('bot', `Eligiendo aleatoriamente una de las rutas posibles: "${elements[randomInclusiveFlow.target].name}".`);
                nextElementId = randomInclusiveFlow.target;
            } else {
                botMessage += ` No se encontraron rutas de salida para la compuerta inclusiva.`;
                endChat();
                return;
            }
            break;

        case 'eventBasedGateway': 
            botMessage = `Hemos llegado a una compuerta basada en eventos "${currentElement.name}". Estamos esperando uno de varios eventos.`;

            const randomEventFlow = getRandomElement(currentElement.outgoing);
            if (randomEventFlow) {
                addMessage('bot', `Simulando que el evento "${elements[randomEventFlow.target].name}" ha ocurrido.`);
                nextElementId = randomEventFlow.target;
            } else {
                botMessage += ` No se encontraron eventos de salida para la compuerta basada en eventos.`;
                endChat();
                return;
            }
            break;

        case 'intermediateThrowEvent':
            botMessage = `Ha ocurrido un evento: "${currentElement.name}".`;
            nextElementId = currentElement.outgoing[0]?.target;
            break;

        case 'endEvent':
            botMessage = `El proceso ha concluido: "${currentElement.name}". ¡Gracias por usar el chatbot!`;
            endChat();
            return;
    }

    addMessage('bot', botMessage);

    if (expectsUserInput) {
        userInput.disabled = false;
        sendButton.disabled = false;
    } else if (nextElementId) {
        setTimeout(() => {
            currentElement = elements[nextElementId];
            proceedChat();
        }, 1000);
    } else {
        addMessage('bot', `Parece que hemos llegado a una parte no manejada del proceso o al final del flujo actual. Por favor, intente iniciar un nuevo chat si tiene más preguntas.`);
        endChat();
    }
}

async function handleUserInput() {
    const userText = userInput.value.trim();
    if (!userText) return;

    addMessage('user', userText);
    userInput.value = ''; 

    userInput.disabled = true;
    sendButton.disabled = true;

    const userLower = userText.toLowerCase();

    let nextFlow = null;
    const possibleFlows = currentElement.outgoing;

    if (currentElement.type === 'exclusiveGateway' ||
        (currentElement.type === 'task' && (currentElement.outgoing.length > 1 || (currentElement.name && currentElement.name.includes('?')))) ||
        currentElement.type === 'subProcess') { 

        for (const flow of possibleFlows) {
            const flowNameLower = flow.name.toLowerCase();

            if (flowNameLower && userLower.includes(flowNameLower)) {
                nextFlow = flow;
                break;
            }

            if ((userLower === 'sí' || userLower === 'si')) {
                if (flowNameLower === 'si' || flowNameLower === 'sí') { 
                    nextFlow = flow;
                    break;
                }

                if (currentElement.outgoing.length > 0 && !flowNameLower && currentElement.outgoing.indexOf(flow) === 0) {
                    nextFlow = flow;
                    break;
                }
            }
            if (userLower === 'no') {
                if (flowNameLower === 'no') { 
                    nextFlow = flow;
                    break;
                }

                if (currentElement.outgoing.length > 1 && !flowNameLower && currentElement.outgoing.indexOf(flow) === 1) {
                    nextFlow = flow;
                    break;
                }
            }

            if (currentElement.name === 'Qué quiere realizar el usuario?') {
                if (userLower.includes('seguimiento') && elements[flow.target]?.name === 'Seguimiento') {
                    nextFlow = flow;
                    break;
                }
                if (userLower.includes('envio') && elements[flow.target]?.name === 'Envío') {
                    nextFlow = flow;
                    break;
                }
                if (userLower.includes('consulta') && elements[flow.target]?.name === 'Consulta') {
                    nextFlow = flow;
                    break;
                }
            }

            if (currentElement.name === 'Solicitud Documentación del usuario') {
                if ((userLower.includes('sí') || userLower.includes('si')) && elements[flow.target]?.name === 'Verificación de la documentación (¿Documentación completa?)') {
                    nextFlow = flow;
                    break;
                }
                if (userLower.includes('no') && elements[flow.target]?.name === 'Envío cancelado') {
                    nextFlow = flow;
                    break;
                }
            }

            if (currentElement.name === 'Verificación de la documentación (¿Documentación completa?)') {
                if (userLower.includes('no')) {
                        addMessage('bot', "Documentación incompleta. Por favor, vuelva a enviar los documentos requeridos.");
                        currentElement = elements['Id_c72c6ce3-757a-4b93-a055-4cc2f27e1caf']; 
                        userInput.disabled = false;
                        sendButton.disabled = false;
                        return; 
                }
            }
        }

        if (nextFlow) {
            currentElement = elements[nextFlow.target];
            await proceedChat();
        } else {
            let possibleChoices = currentElement.outgoing.map(flow => flow.name.toLowerCase()).filter(name => name);
            if (possibleChoices.length === 0) possibleChoices = ['sí', 'no']; 

            addMessage('bot', `No entendí su elección. Por favor, responda con una de las siguientes opciones: ${possibleChoices.join(', ')}.`);
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    } else {

        if (currentElement.type === 'parallelGateway' ||
            currentElement.type === 'inclusiveGateway' ||
            currentElement.type === 'eventBasedGateway' ||
            currentElement.name === 'Solicitud número de seguimiento' ||
            currentElement.name === 'Consulta' ||
            currentElement.name === 'Decisión administrativa' ||
            currentElement.name === 'Generación de número de seguimiento' ||
            currentElement.name === 'Realizar envío' ||
            currentElement.name === 'Seguimiento' ||
            currentElement.name === 'Envío' ||
            currentElement.name === 'Validación de identidad' ||
            currentElement.name === 'Consulta sobre el envío asociado' ||
            currentElement.name === 'Base de datos (búsqueda de la encomienda)') {

            addMessage('bot', `Recibido: "${userText}". Procesando...`);

            await proceedChat(); 
        } else {
            addMessage('bot', `Lo siento, no puedo procesar esa entrada en esta etapa. Por favor, reinicie el chat.`);
            endChat();
        }
    }
}

loadBpmnBtn.addEventListener('click', async () => {
    const xml = bpmnXmlInput.value;
    if (!xml) {
        customAlert('Error', 'Por favor, pegue el XML de BPMN en el área de texto primero.');
        return;
    }

    try {
        await viewer.importXML(xml);
        viewer.get('canvas').zoom('fit-viewport');
        customAlert('Éxito', '¡Diagrama BPMN cargado correctamente!');

        const parsedResult = await parseBPMN(xml);
        if (parsedResult) {
            bpmnProcess = parsedResult.process;
            elements = parsedResult.elements;
            const startEvent = Object.values(elements).find(el => el.type === 'startEvent');
            if (startEvent) {
                currentElement = startEvent;
                highlightElement(currentElement.id);
            }
        } else {
            bpmnProcess = null;
            elements = {};
            currentElement = null;
        }
    } catch (err) {
        customAlert('Error', `No se pudo importar el diagrama BPMN: ${err.message}`);
        bpmnProcess = null;
        elements = {};
        currentElement = null;
    }
});

startChatButton.addEventListener('click', async () => {
    chatMessagesDiv.innerHTML = ''; 
    isChatActive = true;
    startChatButton.disabled = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    if (!bpmnProcess || Object.keys(elements).length === 0) {
        customAlert('Error', 'Por favor, cargue un diagrama BPMN primero haciendo clic en "Cargar Diagrama BPMN".');
        endChat();
        return;
    }

    const startEvent = Object.values(elements).find(el => el.type === 'startEvent');
    if (startEvent) {
        currentElement = startEvent;
        await proceedChat();
    } else {
        customAlert('Error', 'No se encontró ningún evento de inicio en el diagrama BPMN cargado. No se puede iniciar el chat.');
        endChat();
    }
});

sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !userInput.disabled) {
        handleUserInput();
    }
});

function endChat() {
    isChatActive = false;
    userInput.disabled = true;
    sendButton.disabled = true;
    startChatButton.disabled = false;
    currentElement = null;
    if (lastHighlightedElementId) {
        viewer.get('canvas').removeMarker(lastHighlightedElementId, 'highlight');
        lastHighlightedElementId = null;
    }
    addMessage('bot', "Sesión de chat finalizada. Haga clic en 'Iniciar Chat' para comenzar una nueva conversación.");
}

