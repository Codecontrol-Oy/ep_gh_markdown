var underscore = require('ep_etherpad-lite/static/js/underscore');
var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;
var padEditor;
var state = 0;

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_addImage = underscore(image.addImage).bind(context);
  editorInfo.ace_removeImage = underscore(image.removeImage).bind(context);
}

function toggleMarkdown(context, $inner) {
  var converter = new showdown.Converter();
      converter.setFlavor('github');
  // State == 0 Convert md to html
  // else html to md
  if (state == 0) {
    var contents = [];
    // Map through each magicdiv within ace body and get the text
    $inner.children('div').each(function () {
      var text = $(this).text();
      text = text.replace(/(>\s*)(-)/, '$1&ndash;');
      contents.push(text);
      
      if (~text.indexOf("#") || text === '') contents.push('<p></p>');
      console.log(text);
    });
    // Join the text and convert to html with showdown lib
    contents = contents.join('\n').toString();
    contents = converter.makeHtml(contents);
    console.log('----------------')
    console.log(contents);
    // TODO: Replace text
    $inner.append(contents); // Append the contents for now
    state = 1;
  } else {
    // TODO: Toggle back to markdown.

    state = 0;
  }
}

exports.postAceInit = function (hook, context) {
  context.ace.callWithAce(function (ace) {
    var doc = ace.ace_getDocument();
    var $inner = $(doc).find('#innerdocbody');
    
    $('.ep_gh_markdown').click(function () {
      toggleMarkdown(context, $inner);
    })


    var lineHasContent = false;

    $inner.on("drop", function (e) {
      e = e.originalEvent;
      var file = e.dataTransfer.files[0];
      if (!file) return;
      // don't try to mess with non-image files
      if (file.type.match('image.*')) {
        var reader = new FileReader();
        reader.onload = (function (theFile) {
          //get the data uri
          var dataURI = theFile.target.result;
          //make a new image element with the dataURI as the source
          var img = document.createElement("img");
          img.src = dataURI;
          // Now to insert the base64 encoded image into the pad
          context.ace.callWithAce(function (ace) {
            var rep = ace.ace_getRep();
            ace.ace_addImage(rep, img.src);
          }, 'img', true);

        });
        reader.readAsDataURL(file);
      }
    });

    // On control select do fuck all, I hate this..
    $inner.on("oncontrolselect", ".control", function () {
    })

    // On drag end remove the attribute on the line
    // Note we check the line number has actually changed, if not a drag start/end
    // to the same location would cause the image to be deleted!
    $inner.on("dragend", ".image", function (e) {
      var id = e.currentTarget.id;
      var imageContainer = $inner.find("#" + id);
      var imageLine = $inner.find("." + id).parents("div");
      var oldLineNumber = imageLine.prevAll().length;
      context.ace.callWithAce(function (ace) {
        var rep = ace.ace_getRep();
        var newLineNumber = rep.selStart[0];
        if (oldLineNumber !== newLineNumber) {
          // We just nuke the HTML, potentially dangerous but seems to work
          $(imageContainer).remove();
          // We also remove teh attribute hoping we get the number right..
          ace.ace_removeImage(oldLineNumber);
        }
      }, 'img', true);

      // TODO, if the image is moved only one line up it will create a duplicate
      // IF the line is already populated, nothing much I can do about that for now
    })
  }, "image", true);
}

var image = {
  removeImage: function(lineNumber){
    var documentAttributeManager = this.documentAttributeManager;
    // This errors for some reason..
    documentAttributeManager.removeAttributeOnLine(lineNumber, 'img'); // make the line a task list
  },
  addImage: function(rep, src){
    var documentAttributeManager = this.documentAttributeManager;
    // Get the line number
    var lineNumber = rep.selStart[0];
    // This errors for some reason..
    src = "<img src="+src+">";
    documentAttributeManager.setAttributeOnLine(lineNumber, 'img', src); // make the line a task list
  }
}

exports.aceEditorCSS = function (hook_name, cb) {
  return ["/ep_gh_markdown/static/css/markdown.css", "/ep_gh_markdown/static/css/highlight.css"];
} // inner pad CSS

exports.aceAttribsToClasses = function (hook_name, context) {
  console.log('AttrToClasses: ');
  console.log(context);
  console.log('----------------------------------------------------------------');
  var key = context.key;
  var value = context.value;
  if (key == 'url') return ['url-' + value];
  if (key == 'img') return [value];
  if (key == 'alt') return [value];
  if (key == 'title') return [value];
  if (key == 'code') return ['code'];
  if (key == 'blockquote') return ['blockquote'];
  if (key == 'lang') return ['language-' + value];
}

exports.aceDomLineProcessLineAttributes = function (hook, context) {
  console.log('Process: ');
  console.log(context);
  console.log('----------------------------------------------------------------');

}

exports.aceDomLinePreProcessLineAttributes = function (hook, context) {
  console.log('Preprocess: ')
  console.log(context);
  console.log('----------------------------------------------------------------');
  var cls = context.cls;

  var img = /(?:^| )img-(\S*)/.exec(cls);
  var alt = /(?:^| )alt-(\S*)/.exec(cls);
  if (alt) alt = alt[1];
  var modifier = {
    preHtml: '',
    postHtml: '',
    processedMarker: false
  };

  if (img) {
    img = hasHttp(img[1]);
    modifier = {
      preHtml: `<img src="${img}" style="height: auto; width: auto;">`,
      postHtml: '</img>',
      processedMarker: true
    }
  }
  return [modifier];
}

exports.aceCreateDomLine = function (hook, context) {
  console.log('CreateDOM: ');
  console.log(context);
  console.log('----------------------------------------------------------------');
  var cls = context.cls;
  var url = /(?:^| )url-(\S*)/.exec(cls);
  var code = /code/.exec(cls);
  var blockquote = /blockquote/.exec(cls);
  var lang = /(?:^| )language-(\S*)/.exec(cls);
  if (lang) lang = 'language-' + lang[1];
  if (lang == null) lang = '';
  var modifier = {
    extraOpenTags: '',
    extraCloseTags: '',
    cls: cls
  };
  if (url) {
    url = hasHttp(url[1]);
    modifier = {
      extraOpenTags: '<a href="' + url + '">',
      extraCloseTags: '</a>',
      cls: cls
    }
  }
  if (code) modifier = { extraOpenTags: '<code class="' + lang + '">', extraCloseTags: '</code>', cls: cls };
  if (blockquote) modifier = { extraOpenTags: '<blockquote><p>', extraCloseTags: '</blockquote>', cls: cls};

  return [modifier];
}

function hasHttp(url) {
  if (!/^http:\/\//.test(url) && !/^https:\/\//.test(url)) url = "http://" + url;
  return url;
}

exports.acePostWriteDomLineHTML = function (hook, context) {
  console.log('PostWrite: ')
  console.log(context);
  console.log('----------------------------------------------------------------');
  if (context.node.children) {
    for (var child of context.node.children) {
      if (child.nodeName === "CODE") {
        hljs.highlightBlock(child);
      }
    }
  }
}

exports.ccRegisterBlockElements = function (name, context) {
  console.log("ccRegisterBlock: ");
  console.log(context);
  console.log('-----------------------------------------------------------------');
  return ['img'];
}

exports.collectContentPre = function (hook, context) {
  console.log('PreCollect: ');
  console.log(context);
  console.log('----------------------------------------------------------------');
  var cc = context.cc;
  var state = context.state;
  var tname = context.tname;
  var url = /(?:^| )url-(\S*)/.exec(context.cls);
  var lang = /(?:^| )language-(\S*)/.exec(context.cls);
  if (url) cc.doAttrib(state, "url::" + url[1]);
  if (lang) cc.doAttrib(state, "lang::" + lang[1]);
  if (tname == "code") cc.doAttrib(state, "code");
  if (tname == "blockquote") cc.doAttrib(state, "blockquote");
}

exports.collectContentImage = function (name, context) {
  console.log('CollectImageContent: ');
  console.log(context);
  console.log('-----------------------------------------------------------------');
  var tname = context.tname;
  var state = context.state;
  var node = context.node;
  if (tname == "img") {
    if (node.src) state.lineAttributes['img'] = 'img-' + node.src;
    if (node.alt) state.lineAttributes['alt'] = 'alt-' + node.alt;
    if (node.title) state.lineAttributes['title'] = 'title-' + node.title;
  }
}