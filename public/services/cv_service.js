class CV_SERVICE {
    /**
     * We will use this method privately to communicate with the worker and 
     * return a promise with the result of the event. This way we can call 
     * the worker asynchronously.
     */
    _dispatch(event) {
      const { msg } = event
      this._status[msg] = ['loading']
      this.worker.postMessage(event)
      return new Promise((res, rej) => {
        let interval = setInterval(() => {
          const status = this._status[msg]
          if (status) {
            if(status[0] === 'done') res(status[1])
            if(status[0] === 'error') rej(status[1])
            if(status[0] !== 'loading') { 
              delete this._status[msg]
              clearInterval(interval)
            }
          }
        }, 30)
      }) 
    }
  
    /**
     * First, we will load the worker and we will capture the onmessage
     * and onerror events to know at all times the status of the event
     * we have triggered.
     * 
     * Then, we are going to call the 'load' event, as we've just 
     * implemented it so that the worker can capture it.
     */
    loadArucoWebWorker() {
      this._status = {}
      this.worker = new Worker('../js/cv.worker.js') // load worker
  
      // Capture events and save [status, event] inside the _status object
      this.worker.onmessage = e => this._status[e.data.msg] = ['done', e]
      this.worker.onerror = e => this._status[e.data.msg] = ['error', e]
      return this._dispatch({ msg: 'load' })
    }
  
    /**
     * We are going to use the _dispatch event that we created before to 
     * call the postMessage with the msg and the image as payload.
     * 
     * Thanks to what we have implemented in the _dispatch, this will 
     * return a promise with the processed image.
     */
    poseEstimation(payload) {
      return this._dispatch({ msg: 'poseEstimation', payload })
    }

    calibrateCamera(payload) {
      return this._dispatch({ msg: 'calibrateCamera', payload })
    }

    extractArucoForCalib(payload) {
      return this._dispatch({ msg: 'extractArucoForCalib', payload })
    }
  }
  
  // Export the same instant everywhere
  export default new CV_SERVICE()