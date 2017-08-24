var username = undefined;
var password = undefined;
var hotp = undefined;
var logintoken = undefined;
var forceLoginOnThisDevice = false;

/* CONFIG */
var websocketServer = 'wss://hotp.herokuapp.com/test/websocket/';

var outgoingWebsocket;

function showAppropriateForm(){
    if(hotp !== undefined && !forceLoginOnThisDevice){
        if(username !== undefined && password !== undefined){
            //ODESLAT
        } else {
            // Zobrazit mobilní verzi
            initiateSender();
            $("#mobile").addClass("shown");
        }
    } else {
        if(username !== undefined && password !== undefined){
            // Zobrazit PC verzi
            initiateReceiver();
            $("#hotp").addClass("shown");
        } else {
            forceLoginOnThisDevice = false;
            $("#login").addClass("shown");
        }
    }
}

function generateEmoji(code){
    if(code < 0){
        code = - code;
    }
    while(code > 1){
        $(".emoji").append('<img src="img/emoji/' + ((code % 1401)+1) + '.svg" />');
        code = Math.floor(code / 1401); 
    }
    
}

function initiateReceiver(){
    initiateWebSocket('receiver', function(event) {
        console.log(event);
        var data = event.data.split("=");
        if(data.length === 2){
            if(data[0] === "pair"){
                generateEmoji(data[1]);
            } else if(data[0] === "otp"){
                $("#HOTPcode input[name=code]").val(data[1]);
                $("#HOTPcode").submit();
            }
        }
    });
}

function initiateSender(){
    outgoingWebsocket = initiateWebSocket('sender', function(event) {
        console.log(event);
        var data = event.data.split("=");
        if(data.length === 2){
            if(data[0] === "pair"){
                generateEmoji(data[1]);
                $("#mobile").addClass("online");
            }
        }
    });
    $("#authok").click(function(){
        outgoingWebsocket.send('otp=' + hotp);
    });
}

function initiateWebSocket(mode, fonmessage){
    if(!('WebSocket' in window)){
        return;
    }
    var webSocket = 
      new WebSocket(websocketServer + username + '/' + mode);

    webSocket.onerror = function(event) {
      console.log("Websocket error!");
      console.log(event);
    };

    webSocket.onopen = function(event) {
      console.log("Successfully connected to websocket as a " + mode);
    };
    
    webSocket.onmessage = fonmessage;
    return webSocket;
}

function completePOSTData(){
    var data = {};
    if(username !== undefined){
        data.username = username;
    }
    
    if (logintoken !== undefined) {
        data.logintoken = logintoken;
    } else if(password !== undefined){
        data.password = password;
    }
    
    if(hotp !== undefined){
        data.code = hotp;
    }
    
    return data;
}

function setWrongPasswordAlert(state){
    if(state){
        $("#singlebox").addClass("wrongpassword");
    } else {
        $("#singlebox").removeClass("wrongpassword")
    }
}

function setWrongCodeAlert(state){
    if(state){
        $("#singlebox").addClass("wrongcode");
    } else {
        $("#singlebox").removeClass("wrongcode")
    }
}

function tryLogin(){
    var data = completePOSTData();
    console.log(data);
    forceLoginOnThisDevice = true;
    $.ajax("https://hotp.zelitomas.cf/new/login.php", {
            dataType: 'json',
            method: 'POST',
            data: data
        }).then(function(result){
            
            console.log(result);
            if(result.alert !== undefined){
                if(result.alertDelay !== undefined){
                    setTimeout(function(){
                        alert(result.alert);
                    }, result.alertDelay);
                } else {
                    alert(result.alert);
                }
            }
            if(result.status === "LOGGED_IN"){
                setWrongPasswordAlert(false);
                setWrongCodeAlert(false);
                alert("Přihlašovací údaje ověřeny //TODO");
                return;
            }
            
            if(result.status === "OTP_REQUIRED") {
                setWrongPasswordAlert(false);
                logintoken = result.logintoken;
            } else if(result.status === "WRONG_LOGIN"){
                setWrongPasswordAlert(true);
                username = undefined;
                password = undefined;
                logintoken = undefined;
            } else if(result.status === "WRONG_OTP"){
                setWrongCodeAlert(true);
                hotp = undefined;
            }
            
            $(".shown").removeClass("shown");
            showAppropriateForm();
        }, function(err){
            console.log(err);
            alert("Server error. Sorry.");
        });
}

$(document).ready(function(){
    
    // This type of service should always have HTTPS and preferably HSTS preload  
    // turned on and should NEVER rely on those silly lines of code below!
    if(location.protocol === "http:"){
        //location.protocol = "https:";
    }
    
    if(location.hash.length > 1){
        var settings = location.hash.substr(1).split("&");
        for(var i in settings){
            settings[i] = settings[i].split("=");
            if(settings[i][0] === "username"){
                username = settings[i][1];
                $("form#loginPassword input[name=login]").val(username);
            }else if(settings[i][0] === "code"){
                hotp = settings[i][1];
                $("#code").html(hotp);
            }
        }
    }
    
    $("#loginPassword").submit(function(){
        username = $("#loginPassword input[name=login]").val();
        password = $("#loginPassword input[name=password]").val();
        
        tryLogin();
        
        return false;
    });
    
    $("#HOTPcode").submit(function(){
        hotp = $("#HOTPcode input[name=code]").val();
        tryLogin();
        return false;
    });
    
    $(".switchtoofflineauth").click(function(){
        $("#mobile").removeClass("online");
    });
    
    $(".showcode").click(function(){
        $("#mobile").removeClass("online");
        $("#mobile").addClass("codeShown");
    });
    
    $(".loginhere").click(function(){
        forceLoginOnThisDevice = true;
        $("#mobile").removeClass("shown");
        showAppropriateForm();
    });
    
    showAppropriateForm();
});
