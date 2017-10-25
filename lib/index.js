var lunr = require('lunr');
module.exports = plugin;

function plugin(opts){
  return function(files, metalsmith, done){
    opts = setDefaultOptions(opts);
    var index = getIndex(opts, files);
    addJSONtoMetalsmith(index, files, opts);
    done();
  };
};

//Creates the lunr index
function getIndex(opts, files){
  var index = lunr(function () {
    this.metadataWhitelist = opts.metadataWhitelist;

    if (opts.pipelineFunctions) {
      this.pipeline.reset();
      opts.pipelineFunctions.forEach( (f) => {
        this.pipeline.add(f);
      });
    }

    for(field in opts.fields){
      this.field(field);
    }

    this.ref(opts.ref);
    indexDocs(this, files, opts);
  });

  return index;
}

//Adds docs to the lunr object if docs is flagged to be indexed
function indexDocs(builder, files, opts){
  for (file in files){
    if(files[file].lunr){
      var docIndex = createDocumentIndex(opts, files[file], file);
      builder.add(docIndex);
    }
  }
}

//Creates new object to add to the lunr search index
function createDocumentIndex(opts, file, path){
  var contents, index = {};
  if(opts.ref == 'filePath'){
    index.filePath = path;
  }else{
    index[opts.ref] = file[opts.ref];
  }
  for (field in opts.fields){
    if(field === 'contents'){
      if(typeof opts.preprocess === 'function'){
        contents = opts.preprocess.call(file, file.contents.toString());
        index.contents = String(contents);
      }else{
        index.contents = file.contents.toString();
      }
    }else{
      index[field] = file[field];
    }
  }

  return index;
}

//Adds the search index JSON file to Metalsmith metadata for build
function addJSONtoMetalsmith(index, files, opts){
  var contents = JSON.parse(JSON.stringify(index)); // deep copy

  if(opts.includeFields.length > 0) {
    contents.files = {};
    for (file in files){
      var fileData = {};
      for (field of opts.includeFields) {
        fileData[field] = files[file][field];
      }
      contents.files[files[file][opts.ref]] = fileData;
    }
  }

  files[opts.indexPath] = {contents: JSON.stringify(contents)};
}


function setDefaultOptions(opts){
    opts = opts || {};
    opts.indexPath = opts.indexPath || 'searchIndex.json';
    opts.fields = opts.fields || {contents: 1};
    opts.ref = opts.ref || 'filePath';
    opts.pipelineFunctions = opts.pipelineFunctions || null;
    opts.includeFields = opts.includeFields || [];
    opts.metadataWhitelist = opts.metadataWhitelist || [];
    return opts;
}
