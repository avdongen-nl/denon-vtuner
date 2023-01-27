const http = require("http");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var { DOMParser} = require("xmldom");
const serverurl = 'https://vtuner.com/setupapp/guide/asp/';

const statics = [
	{prefix: "/setupapp/denon/asp/BrowseXML/loginXML.asp",response:"<EncryptedToken>123456789abcdef0</EncryptedToken>"},
	{prefix: "/setupapp/denon/asp/browsexm2/loginXML.asp",response:"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\" ?><ListOfItems><ItemCount>-1</ItemCount>"+
	  "<Item><ItemType>Dir</ItemType><Title>Genre</Title>"+
	  "<UrlDir>http://denon.vtuner.com/setupapp/BrowseStations/StartPage.asp?sBrowseType=Format</UrlDir></Item>"+
	  "<Item><ItemType>Dir</ItemType><Title>Location</Title>"+
	  "<UrlDir>http://denon.vtuner.com/setupapp/BrowseStations/StartPage.asp?sBrowseType=Location</UrlDir></Item>"+
	  "<Item><ItemType>Dir</ItemType><Title>Language</Title>"+
	  "<UrlDir>http://denon.vtuner.com/setupapp/BrowseStations/StartPage.asp?sBrowseType=Language</UrlDir></Item>"+
	  "<Item><ItemType>Dir</ItemType><Title>Nederland</Title>"+
	  "<UrlDir>http://denon.vtuner.com/setupapp/BrowseStations/BrowsePremiumStations.asp?sCategory=Netherlands&amp;sBrowseType=Location</UrlDir></Item>"+
	  "<Item><ItemType>Dir</ItemType><Title>Nederlands</Title>"+
	  "<UrlDir>http://denon.vtuner.com/setupapp/BrowseStations/StartPage.asp?sCategory=dut&amp;sBrowseType=Language&amp;sNiceLang=Dutch</UrlDir></Item>i"+
	  "</ListOfItems>"},
	{prefix: "/setupapp/BrowseStations/StartPage.asp", responsefunc:(url, res1) => { BrowseGenres(url, res1);}},
	{prefix: "/setupapp/BrowseStations/BrowsePremiumStations.asp", responsefunc:(url, res1) => { BrowseStations(url, res1);}},
	{prefix: "/setupapp/BrowseStations/dynampls.asp", responsefunc:(url, res1) => {GetStation(url, res1);}}
];


const server = http.createServer((req, res) => {
  let url = new URL("http://localhost"+req.url);
  console.log("received "+url.pathname + " and query "+url.search);
  var match = statics.filter((element) => {console.log(element); console.log(element.prefix); return (url.pathname.indexOf(element.prefix) === 0);} );
  console.log("match "+match);
  console.log("match "+match.length);
  if (match.length > 0) {
    console.log("match found");
	  if (match[0].response !== undefined) {
		  console.log("Const response");
          res.end(match[0].response);
	  } else {
		  console.log( "function response");
		  match[0].responsefunc(url, res);
	  }
  }
});

server.listen(3000, "localhost", () => {
  console.log("Listening for request");
});
function getWebpage(url, callback) {
        var webpage;
        let httpreq =new XMLHttpRequest();
        httpreq.open("GET", url, false);
        httpreq.responseType = "document";
        httpreq.send();
        return httpreq.responseText;
}

function fixHtmlErrors(text) {
        text = text.replace(/<HEAD/, '<head');
        text = text.replace(/<\/HEAD>/g, '</head>');
        text = text.replace(/<A /g, '<a ');
        text = text.replace(/<\/A>/g, '</a>');
        text = text.replace(/<TR /g, '<tr ');
        text = text.replace(/<\/TR>/g, '</tr>');
        text = text.replace(/<TD /g, '<td ');
        text = text.replace(/<\/TD>/g, '</td>');
        return text;
}

function getGenre(queryparams) {
	const vtunerurl=serverurl + "BrowseStations/StartPage.asp"+ queryparams;

        let response = getWebpage(vtunerurl);
        var result = [];
        response = fixHtmlErrors(response);
        const doc = new DOMParser().parseFromString(response,'text/html');
        const links = doc.getElementsByTagName('td');
        for (let i = 0; i < links.length; i++) {
			if (links[i].getAttribute('class') !== 'links') { continue; }
                const anchors = links[i].getElementsByTagName('a');
                for (let j=0; j<anchors.length; j++) {
                        const link = anchors[j];
                        result.push({link: link.getAttribute('href').replace(/\s/g, '+'), name:link.firstChild.data, type: 'Dir'});
                }
        }
		result = result.sort((a, b) => {
			const nameA = a.name.toUpperCase(); // ignore upper and lowercase
			const nameB = b.name.toUpperCase(); // ignore upper and lowercase
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}			
			// names must be equal
			return 0;
		});
		const pagelinks = doc.getElementsByTagName('a');
		for (let i=0; i< pagelinks.length; i++) {
			if (pagelinks[i].getAttribute('class') !== 'paging') { continue; }
			result.push({link: pagelinks.getAttribute('href'), name: "page "+link.firstChild.data, type: 'Dir'});
		}
				
        return result;
}

function getStationList(vtunerurl) {
	let response = getWebpage(vtunerurl);
	var result = [];
	response = fixHtmlErrors(response);
	const doc = new DOMParser().parseFromString(response,'text/html');
	const table = doc.getElementById('table2');
	if (table === undefined || table == null) {
		console.log("Cannot find table2 in page "+vtunerurl);
		console.log(response);
		exit;
	}
	console.log("isolated table");
	const links = table.getElementsByTagName('td');
	console.log("selected "+links.length+" table cells");
	for (let i = 0; i < links.length; i++) {
		if (links[i].getAttribute('class') !== 'links') { 
			console.log('table cell #'+i+" is not class 'links', skipping");
			continue; 
		}
		const anchors = links[i].childNodes;
		
		console.log("table cell #"+i+" of class links has "+anchors.length+" anchors inside");

		for (let j=0; j<anchors.length; j++) {
			var link = anchors[j];
			if (link.tagName != 'a')
				continue;
			var hrefAttr = link.getAttribute('Href');
			var name = link.firstChild.data;
			if (hrefAttr == undefined || hrefAttr == '' || name == undefined || name == '' )
				continue;
			console.log(hrefAttr);
			if (hrefAttr.indexOf('BrowsePremiumStations.asp') >= 0) {
				continue;
			}
			result.push({link: hrefAttr, name: name, type: 'Station'});
			console.log(result[result.length-1]);
		}
	}
	const pagelinks = doc.getElementsByTagName('a');
	for (let i=0; i< pagelinks.length; i++) {
		var link = pagelinks[i];
		if (link.getAttribute('class') !== 'paging') { continue; }
		console.log(link.attributes);
		result.push({link:link.getAttribute('HREF'), name: "page "+link.firstChild.firstChild.data, type: 'Dir'});
	}
	return result;
}

function getStationRedirect(vtunerurl) {
	let response = getWebpage(vtunerurl);
	response = fixHtmlErrors(response);
	const doc = new DOMParser().parseFromString(response,'text/html');
	const audioElements = doc.getElementsByTagName('audio');
	console.log("selected "+audioElements.length+" audio elements");
	for (let i = 0; i < audioElements.length; i++) {
		var srcAttr = link.getAttribute('src');
		if (srcAttr == undefined || srcAttr == '' )
			continue;
		console.log(srcAttr);
		return(srcAttr);
	}    
	const scripts = doc.getElementsByTagName('script');
	console.log("selected "+scripts.length+" script elements");
	for (let i=0; i<scripts.length; i++) {
		console.log(scripts[i].firstChild);
		if (scripts[i].firstChild == null)
		{
			console.log ("no script found");
			continue;
		}
		var scr=scripts[i].firstChild.data;
		pos = scr.indexOf("mp3: ");
		console.log("found link at pos "+pos);
		var rest = scr.substr(pos+6);
		console.log("link: "  + rest.substr(0,80));
		var urllen = rest.indexOf("\"");
		srcurl = rest.substr(0, urllen);
		console.log( "found url '" + srcurl+ "'");
		return (srcurl);
	}		
	console.log ("Station at "+vtunerurl+" response "+response+" could not be parsed, returning error mp3"); 
	return 'http://sc2.1.fm:8030/';
}


function EntryToItem(i, listentry) {
	let response = "<Item>";
	if (listentry.link.substr(0, 3) == '../') {
		listentry.link = listentry.link.replace('../', 'http://denon.vtuner.com/setupapp/');
	}
	if (listentry.type == 'Dir') {
		response += '<ItemType>'+listentry.type + "</ItemType><Title>" + listentry.name+ "</Title>"+
			"<UrlDir>"+listentry.link+"</UrlDir></Item>";
	} else if (listentry.type == 'Station') {
		listentry.link = listentry.link.replace('../', serverurl);
		response += '<ItemType>Station</ItemType>'+
		"<StationId>" + i+ "</StationId>"+
		"<StationName>" + listentry.name+ "</StationName>"+
	    "<StationUrl>"+listentry.link+"</StationUrl></Item>";
	}
	return response;
}

function BrowseGenres(url, res2) {
	let list = getGenre(url.search);

	const header = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\" ?><ListOfItems><ItemCount>-1</ItemCount>";
	var body = "";
	const footer = "</ListOfItems>";
	for (let i=0; i< list.length; i++) {
		var entry = EntryToItem(i, list[i]);
		console.log(entry);
		body += entry;
	}	
  	res2.end(header + body + footer);
}



function BrowseStations(url, res) {
	//example:  /setupapp/BrowseStations/BrowsePremiumStations.asp and query ?sCategory=Alternative&sBrowseType=Format&sNiceLOFO=Alternative&fver=1.754333&dlang=dut&startitems=1&enditems=10
	
	if (url.pathname.indexOf('/setupapp/') != 0) {
		console.log ('unexpected base');
	};
	var pathname = url.pathname.replace('/setupapp/', '/');
    var search= url.search.replace(/&mac=[\w\d]*&/, '&');
	console.log('search '+url.search+' w/o mac: '+ search);
	let list = getStationList(serverurl + pathname + search);

	const header = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\" ?><ListOfItems><ItemCount>-1</ItemCount>";
	var body = "";
	const footer = "</ListOfItems>";
	for (let i=0; i< list.length; i++) {
		var entry = EntryToItem(i, list[i]);
		console.log(entry);
		body += entry;
	}	
  	res.end(header + body + footer);
}

function GetStation(url, res) {
	//example:  /setupapp/BrowseStations/dynampls.asp?id=45518&k=c104fb13bec928a3e3cd0905e363be8097586d4657ba8ff55e852d0ddb815f7f
	
	if (url.pathname.indexOf('/setupapp/') != 0) {
		console.log ('unexpected base');
	};
	var pathname = url.pathname.replace('/setupapp/', '/');
	let redirect = getStationRedirect(serverurl + pathname + url.search);
	var pathname = url.pathname.replace('/setupapp/', '/');
	res.writeHead(302, { "location":redirect} );
	res.end();
}
