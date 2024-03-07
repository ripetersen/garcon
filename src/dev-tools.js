import * as fetch from 'node-fetch';

export class TestClient {
  constructor(host) {
    this.host = host
  }

  getJSON(path) {
    const client = this
    fetch(this.host + path)
      .then( res => {
        client.response = res;
        if( res.ok ) {
          return res.json();
        } else {
          throw new Error(res.statusText);
        }
      })
      .then( json => {
        client.json = json;
        console.log(json);
      })
      .catch( (err) => {
        console.error('Error fetching JSON');
        console.error('url:',(this.host+path));
        console.log(err);
      })
  }

  postJSON(path, json) {
    const client = this
    fetch(this.host + path, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(json)})
      .then( res => {
        client.response = res;
        if( res.ok ) {
          return res.json();
        } else {
          throw new Error(res.statusText);
        }
      })
      .then( json => {
        client.json = json;
        console.log(json);
      })
      .catch( (err) => {
        console.error('Error posting JSON');
        console.error('url:',(this.host+path));
        console.log(json);
        console.log(err);
      })
  }
}

