const urlSearchParams = new URLSearchParams(window.location.search);
const playerName = urlSearchParams.get("playerName");
const room = urlSearchParams.get("room");


const mainHeadingTemplate = document.querySelector(
    "#main-heading-template"
).innerHTML;

const welcomeHeadingHTML = Handlebars.compile(mainHeadingTemplate);

document.querySelector("main").insertAdjacentHTML(
    "afterBegin",
    welcomeHeadingHTML({
        playerName,
    })
);

const socket = io();
socket.emit('join', { playerName, room }, error => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});

socket.on('message', ({ playerName, text, createdAt }) => {
    const chatMessages = document.querySelector(".chat__messages");

    const messageTemplate = document.querySelector("#message-template").innerHTML;

    const template = Handlebars.compile(messageTemplate);

    const html = template({
        playerName,
        text,
        createdAt: moment(createdAt).format("h:mm a"),
    });

    chatMessages.insertAdjacentHTML("afterBegin", html);

});

const chatForm = document.querySelector(".chat__form");

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const chatFormInput = chatForm.querySelector(".chat__message");
    const chatFormButton = chatForm.querySelector(".chat__submit-btn");

    chatFormButton.setAttribute("disabled", "disabled");

    const message = event.target.elements.message.value;

    socket.emit("sendMessage", message, (error) => {
        chatFormButton.removeAttribute("disabled");
        chatFormInput.value = "";
        chatFormInput.focus();

        if (error) return alert(error);
    });
});

socket.on("room", ({ room, players }) => {
    // target the container where we'll attach the info to
    const gameInfo = document.querySelector(".game-info");

    // target the Handlebars template we'll use to format the game info
    const sidebarTemplate = document.querySelector(
        "#game-info-template"
    ).innerHTML;

    // Compile the template into HTML by calling Handlebars.compile(), which returns a function
    const template = Handlebars.compile(sidebarTemplate);

    const html = template({
        room,
        players,
    });

    // set gameInfo container's html content to the new html
    gameInfo.innerHTML = html;
});


//  question

const triviaQuestionButton = document.querySelector(".trivia__question-btn");
triviaQuestionButton.addEventListener("click", () => {
    // pass null as the second argument because we're not sending any data to the server
    // alert the error if the server sends back an error
    socket.emit("getQuestion", null, (error) => {
        if (error) return alert(error);
    });
});


// We'll use this helper function to decode any HTML-encoded
// strings in the trivia questions
// e.g., "According to DeMorgan&#039;s Theorem, the Boolean expression (AB)&#039; is equivalent to:"
const decodeHTMLEntities = (text) => {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = text;
    return textArea.value;
};

socket.on("question", ({ answers, createdAt, playerName, question }) => {
    const triviaForm = document.querySelector(".trivia__form");
    const triviaQuestion = document.querySelector(".trivia__question");
    const triviaAnswers = document.querySelector(".trivia__answers");
    const triviaQuestionButton = document.querySelector(".trivia__question-btn");
    const triviaFormSubmitButton = triviaForm.querySelector(
        ".trivia__submit-btn"
    );

    const questionTemplate = document.querySelector(
        "#trivia-question-template"
    ).innerHTML;

    // Clear out any question and answers from the previous round
    triviaQuestion.innerHTML = "";
    triviaAnswers.innerHTML = "";

    // Disable the Get Question button to prevent the player from trying to skip a question
    triviaQuestionButton.setAttribute("disabled", "disabled");

    // Enable the submit button to allow the player to submit an answer
    triviaFormSubmitButton.removeAttribute("disabled");

    const template = Handlebars.compile(questionTemplate);

    const html = template({
        playerName,
        createdAt: moment(createdAt).format("h:mm a"),
        question: decodeHTMLEntities(question),
        answers,
    });

    triviaQuestion.insertAdjacentHTML("beforeend", html);
});


const triviaForm = document.querySelector(".trivia__form");
triviaForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const triviaFormSubmitButton = triviaForm.querySelector(
        ".trivia__submit-btn"
    );
    const triviaFormInputAnswer = triviaForm.querySelector(".trivia__answer");

    triviaFormSubmitButton.setAttribute("disabled", "disabled");

    const answer = event.target.elements.answer.value;
    socket.emit("sendAnswer", answer, (error) => {
        triviaFormInputAnswer.value = "";
        triviaFormInputAnswer.focus();

        if (error) return alert(error.message);
    });
});

socket.on("answer", ({ playerName, isRoundOver, createdAt, text }) => {
    const triviaAnswers = document.querySelector(".trivia__answers");
    const triviaRevealAnswerButton = document.querySelector(
        ".trivia__answer-btn"
    );

    const messageTemplate = document.querySelector('#message-template').innerHTML;

    const template = Handlebars.compile(messageTemplate);

    const html = template({
        playerName: playerName,
        text,
        createdAt: moment(createdAt).format("h:mm a"),
    });

    triviaAnswers.insertAdjacentHTML("afterBegin", html);

    // If isRoundOver is set to true, activate the reveal answer button
    if (isRoundOver) {
        triviaRevealAnswerButton.removeAttribute("disabled");
    }
});

const triviaRevealAnswerButton = document.querySelector(".trivia__answer-btn");
triviaRevealAnswerButton.addEventListener("click", () => {
    socket.emit("getAnswer", null, (error) => {
        if (error) return alert(error);
    });
});

socket.on("correctAnswer", ({ text }) => {
    const triviaAnswers = document.querySelector(".trivia__answers");
    const triviaQuestionButton = document.querySelector(".trivia__question-btn");
    const triviaRevealAnswerButton = document.querySelector(
        ".trivia__answer-btn"
    );
    const triviaFormSubmitButton = triviaForm.querySelector(
        ".trivia__submit-btn"
    );

    const answerTemplate = document.querySelector(
        "#trivia-answer-template"
    ).innerHTML;
    const template = Handlebars.compile(answerTemplate);

    const html = template({
        text,
    });

    triviaAnswers.insertAdjacentHTML("afterBegin", html);

    triviaQuestionButton.removeAttribute("disabled");
    triviaRevealAnswerButton.setAttribute("disabled", "disabled");
    triviaFormSubmitButton.removeAttribute("disabled");
});