/* GLOBAL / PROCESS VARIABLES */
var port = process.env.PORT || 8080;
var clientId = '3MVG9yZ.WNe6byQAPui.Wyc_IEnEhHocuhGmkGC5wkwLlTYTbGl8M_f8l29.tVxzGmxBBIsNPjvXa3xtabzGi';
var clientSecret = '1029919614556369973';
var redirectURI = 'https://pitangui.amazon.com/spa/skill/account-linking-status.html?vendorId=MCF5CMGZ1RWLL';
var API = process.env.API || 'v37.0';
var oauth_timeout = process.env.oauth_timeout || 5400;
var DEBUG_ON = process.env.DEBUG_ON || true;

/* REQUIRED PACKAGES */
var GoogleMapsAPI = require('./lib/GoogleMapsAPI');


//alexa response transform
var alexa = require('alexa-nodekit');

//express for routing
var express = require('express');
var app = express();
var bodyParser = require("body-parser");
app.use(bodyParser());


//convert OAuth requests to/from Salesforce to Amazon
var sfdc_amazon = require('sfdc-oauth-amazon-express');

//Salesforce REST wrapper
var nforce = require('nforce'),
    chatter =require('nforce-chatter')(nforce);

//Connected App credentials for OAUTH request
var org = nforce.createConnection({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectURI,
  apiVersion: API, 
  mode: 'single',
  plugins: ['chatter']
});

/* Google Maps API stuffs */
var publicConfig = {
  key: 'AIzaSyCaJh09vEh-eKkXiPXAuloUXzBZqCaD4DY',
  stagger_time:       1000, // for elevationPath
  encode_polylines:   false,
  secure:             true, // use https
};
var gmAPI = new GoogleMapsAPI(publicConfig);


/* SETUP ROUTES */

app.get('/', function (req, res) {
  res.jsonp({status: 'running'});
});

app.get('/echo',function(req,res){
org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoEvents'},
                function(err,result) {
                        if(err) {
              console.log(err);
              send_alexa_error(res,'An error occured checking for the next event: '+err);
            }
            else {
                console.log('EchoEvents rest service result: ' + result);
                if(typeof result !== 'undefined'){
                        var parms = {"origins" : result.timesheet__Owner_Lat_Long__c,"destinations" : result.Account.timesheet__Lat_Long__c};

                        console.log("parms: " + parms);
                        var thatResult = result;
                        gmAPI.distance(parms, function(err, mapResult){
                                console.log(err);
                                console.log('rest service result inside of google maps callback: ' + thatResult);

                                console.log('test');
				console.log('duration: ' + duration);
                                var departureDate = new Date(thatResult.StartDateTime);
                                departureDate.setSeconds(departureDate.getSeconds()-duration.value);
                                console.log('departure date: ' + departureDate);

                                var currentDate = new Date();

                                var diffTime = departureDate.getTime() - currentDate.getTime();

                                console.log('Diff time: ' + diffTime);

                                var differenceHours = Math.ceil(diffTime / (1000 * 3600));

                                console.log('difference hours: ' + differenceHours);

                                var differenceMinutes = Math.ceil((diffTime / (1000 * 60)) - (differenceHours * 60));
                                console.log('difference minutes: ' + differenceMinutes);

                                var speech = "Your next meeting is " + duration.text + " away.  You will need to leave in " + differenceHours + " hours and " + differenceMinutes + " minutes."

                                send_alexa_response(res, speech, 'Salesforce', 'Get Next Event', 'Success', false);
                        });
                }
            }

        });
});

app.post('/echo', function (req, res) {
  if(req.body == null) {
        console.log("WARN: No Post Body Detected");
   }
  if(req.body.request.intent == null) {
    route_alexa_begin(req,res);
  } else {
    route_alexa_intent(req,res);
  }
});

sfdc_amazon.addRoutes(app,oauth_timeout,true);

/* List of identifiable intent / actions that the route will respond to */
var intent_functions = new Array();
intent_functions['PleaseWait'] = PleaseWait;
intent_functions['GetCurrentCase'] = GetCurrentCase;
intent_functions['GetLatestCases'] = GetLatestCases;
intent_functions['OpenCase'] = OpenCase;
intent_functions['UpdateCase'] = UpdateCase;
intent_functions['AddPost'] = AddPost;
intent_functions['DaysUntilDreamforce'] = DaysUntilDreamforce;
intent_functions['GetNextEvent'] = GetNextEvent;

function PleaseWait(req,res,intent) {
  send_alexa_response(res, 'Waiting', 'Salesforce', '...', 'Waiting', false);
}

function GetCurrentCase(req,res,intent) {
	org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoCaseControl'},
		function(err,result) {
			if(err) {
              console.log(err);
              send_alexa_error(res,'An error occured checking for recents cases: '+err);
            }
            else {
            	var speech = "Here is your currently opened case:";
	    	      speech += 'Subject ';
	              speech += '. .';
	              speech += result.Subject;
	              speech += '. .';
	              speech += 'Priority ';
	              speech += '. .';
	              speech += result.Priority;
	              speech += '. .';
	              speech += 'Status ';
	              speech += '. .';
	              speech += result.Status;
	              speech += '. .';
                 send_alexa_response(res, speech, 'Salesforce', 'Get Current Case', 'Success', false);
            }

		});
}

function GetNextEvent(req,res,intent) {
        org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoEvents'},
                function(err,result) {
                        if(err) {
              console.log(err);
              send_alexa_error(res,'An error occured checking for the next event: '+err);
            }
            else {
                console.log('REST SERVICE RESULT: ' + result);
                if(typeof result !== 'undefined'){
                      	var parms = {"origins" : result.timesheet__Owner_Lat_Long__c,"destinations" : result.Account.timesheet__Lat_Long__c};
                        console.log('GOOGLE MAPS parms origins: ' + parms["origins"]);
                        console.log('GOOGLE MAPS parms destinations: ' + parms["destinations"]);         

                        var thatResult = result;
  			gmAPI.distance(parms, function(err, mapResult){
    				console.log(err);
                                console.log('THAT RESULT: ' + thatResult);

                                var duration = mapResult.rows[0].elements[0].duration;
				console.log('duration: ' + duration);
                                console.log('duration value: ' + duration.value);
                                var departureDate = new Date(thatResult.StartDateTime);
                                departureDate.setSeconds(departureDate.getSeconds()-duration.value);
                                console.log('departure date: ' + departureDate);

                                var currentDate = new Date();

                                var diffTime = departureDate.getTime() - currentDate.getTime();

                                console.log('Diff time: ' + diffTime);

			        var differenceHours = Math.ceil(diffTime / (1000 * 3600));  

				console.log('difference hours: ' + differenceHours);

                                var differenceMinutes = Math.ceil((diffTime / (1000 * 60)) - (differenceHours * 60));
				console.log('difference minutes: ' + differenceMinutes);

				var speech = "Your next meeting is " + duration.text + " away.  You will need to leave in " + differenceHours + " hours and " + differenceMinutes + " minutes."

				send_alexa_response(res, speech, 'Salesforce', 'Get Next Event', 'Success', false); 
  			});
		}
            }

                });
}


function GetLatestCases(req,res,intent) {
	org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoCaseSearch'},
		function(err,result) {
			if(err) {
              console.log(err);
              send_alexa_error(res,'An error occured checking for recents cases: '+err);
            }
            else {
            	var speech = "Here are your latest cases. ";
            	for(var i = 0; i < result.length; i++) {
                      speech += 'Case Number ';
                       speech += i+1;
                      speech += '. .';
                      speech += result[i].Subject__c;
                      speech += '. .';
                      if(i != result.length-1) {speech += 'Next case,'};
                    }
                    send_alexa_response(res, speech, 'Salesforce', 'Get Latest Cases', 'Success', false);
            }

		});
}

function UpdateCase(req,res,intent) {
	var update = intent.slots.update.value;
    update = update.charAt(0).toUpperCase() + update.slice(1);
    console.log("UPDATE REQUEST>>>>> "+update);

    if(update == 'Hi') { update = 'High'; } //really, Alexa?
    if(update == 'Close') { update = 'Closed'; } //really, Alexa?

    if(update == 'Low' || update == 'Medium' || update == 'High') {
            org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoCaseControl',method:'POST',body:'{"priority":"'+update+'"}'},
            	function(err,result) {
					if(err) {
		              console.log(err);
		              send_alexa_error(res,'An error occured updating this case: '+err);
		            }
		            else {
		            	var speech = 'Updated Case with a priority of '+update;
		            	send_alexa_response(res, speech, 'Salesforce', 'Updated Case', 'Success', false);
		            }

				});
	  
     }  

    else if(update == 'Closed' || update == 'New' || update == 'Working' || update == 'Escalated') {
              org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoCaseControl',method:'POST',body:'{"status":"'+update+'"}'},
            	function(err,result) {
					if(err) {
		              console.log(err);
		              send_alexa_error(res,'An error occured updating this case: '+err);
		            }
		            else {
		            	var speech = 'Updated Case with a status of '+update;
		            	send_alexa_response(res, speech, 'Salesforce', 'Updated Case', 'Success', false);
		            }

				});
     } 

     else {

     	send_alexa_response(res, 'The update request did not hold a valid priority or update', 'Salesforce', 'Updated Case', 'Failed', false);

     }
}

function OpenCase(req,res,intent) {
	var number = intent.slots.number.value;
	number = number.toString();
	console.log("CASE IDENTIFIER>>>>>"+number);
    org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoCaseSearch',method:'POST',body:'{"CaseIdentifier":"'+number+'"}'},
		function(err,result) {
			if(err) {
              console.log(err);
              send_alexa_error(res,'An error occured checking for recents cases: '+err);
            }
            else {
            	var speech = 'Opened Case '+result.Subject__c;
            	send_alexa_response(res, speech, 'Salesforce', 'Open Case', 'Success', false);
            }

		});
}

function DaysUntilDreamforce(req,res,intent){
   var today = new Date();
   var dreamforce = new Date("October 4, 2016");
   var timeLeft = (dreamforce.getTime() - today.getTime());
   var msPerDay = 24 * 60 * 60 * 1000;
   var daysLeft = timeLeft / msPerDay;
   var response = Math.ceil(daysLeft);
   send_alexa_response(res,'There are ' + response + ' days left until Dreamforce.','Salesforce','Is it Dreamforce Yet','Success',false);
}


function AddPost(req,res,intent) {
		var post = intent.slots.post.value;
    	console.log("CHATTER POST>>>>"+post);
    	org.apexRest({oauth:intent.oauth, uri:'/timesheet/EchoCaseSearch',method:'POST',body:'{"CaseIdentifier":null}'},
		function(err,result) {
			if(err) {
              console.log(err);
              send_alexa_error(res,'An error occured checking for recents cases: '+err);
            }
            else {
          		  
          		  if(post == 'follow up') {
		            post = 'We need to follow up with the customer';
		          }

		          if(post == 'next' || post == 'next meeting') {
		            post = 'This needs to be prioritized at the next meeting';
		          }

		          if(post == 'cannot replicate') {
		            post = 'I cannot replicate this issue with the current information';
		          }

		          if(post == 'missing info') {
		            post = 'This case is incomplete, we need more information';
		          }

		          
		          org.chatter.postFeedItem({id: result.Case__c, text: post, oauth: intent.oauth}, function(err, resp) {
		              if(err) {
		                console.log(err);
		                send_alexa_error(res,'An error occured posting to Chatter: '+err);
		              } else {
		                send_alexa_response(res, 'Posted to Chatter', 'Salesforce', 'Post to Chatter', 'Posted to Chatter: '+post, false);
		              }
		          });


            }

		});  
}


//setup actual server
var server = app.listen(port, function () {

  console.log('Salesforce Case Echo running on '+port);
  require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    console.log('addr: '+add);
  });

});




/* UTILIY FUNCTIONS */
function send_alexa_error(res,message) {

	send_alexa_response(res, 'An error occured during that request.  Please see the app log.', 'Salesforce', 'Error', message, true);

}

function send_alexa_response(res, speech, title, subtitle, content, endSession) {
    alexa.response(speech, 
           {
            title: title,
            subtitle: subtitle,
            content: content
           }, endSession, function (error, response) {
           if(error) {
             console.log({message: error});
             return res.status(400).jsonp({message: error});
           }
           return res.jsonp(response);
         });
}


function route_alexa_begin(req, res) {
   
   alexa.launchRequest(req.body);
   if(req.body.session == null || req.body.session.user == null || req.body.session.user.accessToken == null) {
        send_alexa_response(res, 'Please log into Salesforce', 'Salesforce', 'Not Logged In', 'Error: Not Logged In', true);
   } else {
   		send_alexa_response(res, 'Connected to Salesforce',  'Salesforce', 'Connection Attempt', 'Logged In (Single User)', false);
   }
   
   console.log('!----REQUEST SESSION--------!');
   console.log(req.body.session);
   

};


function route_alexa_intent(req, res) {

   if(req.body.session == null || req.body.session.user == null || req.body.session.user.accessToken == null) {
        send_alexa_response(res, 'Please log into Salesforce', 'Salesforce', 'Not Logged In', 'Error: Not Logged In', true);
   } else {
   	   intent = new alexa.intentRequest(req.body);
	   intent.oauth = sfdc_amazon.splitToken(req.body.session.user.accessToken);
	   console.log("INTENT>>>"+intent.intentName);
	   console.log("USERID>>>>"+req.body.session.user.userId);

	   intent_function = intent_functions[intent.intentName];
	   intent_function(req,res,intent);
   }

}
