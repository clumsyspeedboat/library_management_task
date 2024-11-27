function createMessageElement(message, isAi) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(isAi ? 'from-ai' : 'from-user');
    messageElement.innerHTML = `
        <div class="message ${isAi ? 'ai' : 'user'}">${marked.parse(message)}</div>
    `;
    return messageElement;
}

function initChat() {
    fetch('/api/chat/init')
        .then(response => {
            console.log('Fetch response status:', response.status); // Debug
            if (response.status === 500) {
                throw new Error('Server error while initializing chat.');
            } else if (!response.ok) {
                throw new Error('Unexpected error occurred.');
            }
            return response.json();
        })
        .then(message => {
            console.log('Received message:', message); // Debug
            document.getElementById('chat').appendChild(createMessageElement(message.response, true));
        })
        .then(() => {
            document.getElementById('chatbox-send').setAttribute('class', '');
            document.getElementById('chatbox-send').onclick = sendMessage;
            document.getElementById('chatbox-input').onkeydown = function (event) {
                if (event.key === 'Enter') {
                    sendMessage();
                    event.preventDefault();
                }
            };
        });
}

function sendMessage() {
    let input = document.getElementById('chatbox-input').value;
    document.getElementById('chatbox-input').value = '';

    document.getElementById('chat').appendChild(createMessageElement(input, false));
    window.scrollTo(0, document.body.scrollHeight);

    document.getElementById('chatbox-send').setAttribute('class', 'disabled');
    document.getElementById('chatbox-send').onclick = null;
    document.getElementById('chatbox-input').onkeydown = null;

    fetch('/api/chat/message?message=' + encodeURIComponent(input))
        .then(response => {
            console.log('Fetch response status:', response.status); // Debug
            if (response.status === 500) {
                throw new Error('Server error while initializing chat.');
            } else if (!response.ok) {
                throw new Error('Unexpected error occurred.');
            }
            return response.json();
        })
        .then(message => {
            console.log('Received message:', message); // Debug
            document.getElementById('chat').appendChild(createMessageElement(message.response, true));
            window.scrollTo(0, document.body.scrollHeight);
        })
        .then(() => {
            document.getElementById('chatbox-send').setAttribute('class', '');
            document.getElementById('chatbox-send').onclick = sendMessage;
            document.getElementById('chatbox-input').onkeydown = function (event) {
                if (event.key === 'Enter') {
                    sendMessage();
                    event.preventDefault();
                }
            };
        });
}

initChat();