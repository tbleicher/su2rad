(function () {

  function sluggify(text) {
  	return text.split(' ').join('_').toLowerCase();
  }
  
  function createAnchorTag(text) {
  	var aTag = document.createElement('a');
    aTag.setAttribute('id', sluggify(text) );
    aTag.setAttribute('href', getAnchorText(text) );
    aTag.setAttribute('class', "anchor");
    aTag.setAttribute('aria-hidden', "true");
    aTag.appendChild( createSpanTag() );
    return aTag;
  }

  function createLink(text) {
  	var div = document.createElement('div');
  	var aTag = document.createElement('a');
  	aTag.setAttribute( 'href', getAnchorText(text) );
  	aTag.appendChild( document.createTextNode(text) );
  	div.appendChild(aTag);
  	return div;
  }

  function createSpanTag() {
  	var sTag = document.createElement('span');
    sTag.setAttribute('class', "octicon octicon-link");
    sTag.setAttribute('aria-hidden', "true");
    return sTag;
  }

  function getAnchorText(text) {
  	return "#" + sluggify(text);
  }

  // use class 'current' to identify entry in nav header
  var current = document.querySelector(".current");

  // find header entries in 'section' part of document
  var h3s = Array.from(document.querySelectorAll("section > h3"));

  if (current && h3s.length) {
	for (var item of h3s) {
	  var text = item.innerText;
	  item.innerHTML = '';
	  item.appendChild( createAnchorTag(text) );
	  item.appendChild( document.createTextNode(text) );
	  current.appendChild( createLink(item.innerText) );
	}
  }

}());