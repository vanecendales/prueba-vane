// Initial Data
GH_REPO_URL = "https://api.github.com/repos/iliaozhmegov/CV";
GH_TOKEN    = PropertiesService.getScriptProperties().getProperty("github_token"); // github_token in script properties
GH_PURGE    = true;
GD_DOC_ID   = DocumentApp.getActiveDocument().getId();
GD_FOLDER   = "1aba-tnQZxZMN7DN52eAywTU-Xs-eqOf4";
GD_FILENAME = "ILIA_OZHMEGOV_CV.pdf";

function onOpen() {
  const ui = DocumentApp.getUi();
  
  ui.createMenu('Custom')
      .addItem('Trigger rendering', 'render')
      .addItem('Download Latest', 'download_latest')
      .addToUi();
}

function render() {
  var gh = new Github();
  var w  = new Window();

  gh.trigger_actions();

  w.show_countdown();
  w.wait();
  w.show_wait();
  
  gh.wait_rendering();

  w.show_download(gh.download_file());

  if (GH_PURGE){gh.remove_latest_artifact_id();}

}

function download_latest(){
  var gh = new Github();
  var w  = new Window();

  w.show_download(gh.download_file());
}

class Github {
  constructor(repo_url=GH_REPO_URL, 
              token=GH_TOKEN,
              folder=GD_FOLDER,
              filename=GD_FILENAME){
    this.token              = token;
    this.repo_url           = repo_url;
    this.latest_artifact_id = this.get_latest_artifact_id();
    this.folder             = folder;
    this.filename           = filename;
    this.file_download_url  = ''; // will be filled later
  }

  trigger_actions(){
    const url = this.repo_url + "/dispatches";
	  const response = UrlFetchApp.fetch(url, {
        "method": "POST",
        "headers": {
          "Accept":        "application/vnd.github+json",
          "Authorization": "token " + this.token,
          "Content-Type":  "application/json"
	  	},

      "muteHttpExceptions":        true,
      "followRedirects":           true,
      "validateHttpsCertificates": true,

      "contentType": "application/json",
      "payload":     JSON.stringify({"event_type":"render-cv", "client_payload": {"id": GD_DOC_ID}})
	  });

	  Logger.log("Response code is %s", response.getResponseCode());
  }

  get_latest_artifact_id(){
    const url = this.repo_url + "/actions/artifacts";
	  const response = UrlFetchApp.fetch(url, {
      "method": "GET",
      "headers": {
        "Accept":        "application/vnd.github+json",
        "Authorization": "Bearer " + this.token
      },

      "muteHttpExceptions":        true,
      "followRedirects":           true,
      "validateHttpsCertificates": true,
    });


    var data = JSON.parse(response.getContentText()).artifacts;
    
    var latest_time = data[0].created_at;
    var latest_id   = data[0].id;

    // just in case: TC: O(N), SC: O(1)
    for(let i = 1; i < data.length; i++){
      if (latest_time < data[i].created_at){
        latest_time = data[i].created_at;
        latest_id   = data[i].id;
      }
    }

    return latest_id;
  }

  download_file(){
    const id  = this.get_latest_artifact_id();
    const url = this.repo_url + "/actions/artifacts/" + id + "/zip";
    const response = UrlFetchApp.fetch(url, {
      "method": "GET",
      "headers": {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + this.token
      },
      "muteHttpExceptions":        true,
      "followRedirects":           true,
      "validateHttpsCertificates": true,
    });

    var unzipped = Utilities.unzip(response.getBlob());
    var parentFolder = DriveApp.getFolderById(this.folder);
  
    var output = parentFolder.createFile(unzipped[0].setName(this.filename));

    this.file_download_url = DriveApp.getFileById(output.getId()).getDownloadUrl();

    return this.file_download_url;
  }

  wait_rendering(){
    const limit = 30; // seconds
    let i = 0;
    let new_latest_artifact_id = this.get_latest_artifact_id();
    while((this.latest_artifact_id == new_latest_artifact_id) & (i < limit)){
      Utilities.sleep(1000);
      i++;
      new_latest_artifact_id = this.get_latest_artifact_id();
    }

    this.latest_artifact_id = new_latest_artifact_id;
    return i == limit;
  }

  remove_latest_artifact_id(){
    const url = this.repo_url + "/actions/artifacts/" + this.latest_artifact_id;
    const response = UrlFetchApp.fetch(url, {
      "method": "DELETE",
      "headers": {
        "Accept":        "application/vnd.github+json",
        "Authorization": "Bearer " + this.token
      },

      // "muteHttpExceptions":        true,
      // "followRedirects":           true,
      "validateHttpsCertificates": true,
    });

  };
}

class Window {
  constructor(gh_repo_url=GH_REPO_URL){
    this.width  = 500;
    this.height = 370;

    this.render_time = 60; // seconds

    var countdown_url = gh_repo_url.replace("api.github.com/repos", "raw.githubusercontent.com") + "/master/Apps_Script/countdown.html";
    var wait_url      = gh_repo_url.replace("api.github.com/repos", "raw.githubusercontent.com") + "/master/Apps_Script/wait.html";
    var download_url  = gh_repo_url.replace("api.github.com/repos", "raw.githubusercontent.com") + "/master/Apps_Script/download.html";

    this.countdown_html = UrlFetchApp.fetch(countdown_url).getContentText();
    this.wait_html      = UrlFetchApp.fetch(wait_url).     getContentText();
    this.download_html  = UrlFetchApp.fetch(download_url). getContentText();

  }

  show_countdown(){
    var html = HtmlService.createHtmlOutput(this.countdown_html)
      .setWidth (this.width)
      .setHeight(this.height);
    DocumentApp.getUi()
      .showModalDialog(html, 'Your CV is being rendered now...');

      
  }

  wait(){
    Utilities.sleep(this.render_time * 1000);
  }

  show_wait(){
    var html = HtmlService.createHtmlOutput(this.wait_html)
      .setWidth (this.width)
      .setHeight(this.height);

    DocumentApp.getUi()
      .showModelessDialog(html, 'Fethcing zip file...');
  }

  show_download(url){
    const template = HtmlService.createTemplate(this.download_html);
    template.downloadUrl = url;
    const htmlOutput = template.evaluate()
      .setWidth (this.width)
      .setHeight(this.height);

  DocumentApp.getUi()
    .showModalDialog(htmlOutput, "It's ready! Download!");
  }
}


