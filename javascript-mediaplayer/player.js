class Player {

    // Environment Properties
        vidEl
        fileDirectory
        workingDirectory
        listfile
        options = {
            autoplay: true,
            debug: false,
            fireUpdateEvent: false,
            greaterVideoID: 'first',
            name: 'JS Mediaplayer',
            updateFrequency: 500,
            smallerVideoID: 'last'
        }
        timer = null

    // Video Properties
        vidPlaying = 0
        titles = []
        vids = []
        list
        playing = false

    
    /**
     * @param {String}
     */
    constructor(vidEl, fileDirectory, workingDirectory, listfile, options) {
        // Declare environment properties
        if (fileDirectory.endsWith('/')) {
            this.fileDirectory = fileDirectory
        } else {
            this.fileDirectory = fileDirectory + '/'
        }
        this.listfile = listfile
        this.vidEl = document.querySelector(vidEl)
        if (workingDirectory.endsWith('/')) {
            this.workingDirectory = workingDirectory
        } else {
            this.workingDirectory = workingDirectory + '/'
        }
        this.options = {...this.options, ...options}
        this.debugMsg("Environment properties set")

        // Read Querystring for playback options
        this.debugMsg("Read Querystring for playback options")
        var _queryString = window.location.search
        var _urlParams = new URLSearchParams(_queryString)
        if(_urlParams.has('v')) {
            var _v = _urlParams.get('v')
            if (parseInt(_v) > (this.vids.length - 1)){
                switch (this.options.greaterVideoID) {
                    case 'first':
                        this.vidPlaying = 0
                        break
                    case 'last':
                        this.vidPlaying = this.vids.length - 1
                        break
                }
            } else {
                this.vidPlaying = parseInt(_v)
            }
        }
        if(_urlParams.has('list')) {
            this.list = _urlParams.get('list')
        } else {
            this.list = 'all'
        }
        this.debugMsg('Playback options set')

        // Read playlistfile
        var _data = this.readJSON(this.workingDirectory + this.listfile)
        this.vids = _data.playlists[this.list].files
        this.titles = _data.playlists[this.list].titles

        this.debugMsg('Add video ended eventlistener')
        this.vidEl.addEventListener('ended', () => { this.vidEnded(this.options.autoplay)} )

        // Prepare Videosource
        this.debugMsg('Preparing Videosource')
        this.vidEl.src = this.fileDirectory + '/' + this.vids[this.vidPlaying]

        this.debugMsg('Setup completed')
        if(this.options.autoplay) {this.play()}
    }

    play(v) {
        if(typeof v == "number"){
            this.vidPlaying = v
        }

        this.debugMsg('Now playing ' + this.titles[this.vidPlaying])
        this.vidEl.src = this.fileDirectory + this.vids[this.vidPlaying]
        this.vidEl.play()
        this.playing = true
        if(this.options.fireUpdateEvent){
            this.timer = setInterval(() => {
                const _event = new CustomEvent('update', {
                    detail: {
                        currentTime: this.vidEl.currentTime,
                        duration: this.vidEl.duration,
                        title: this.titles[this.vidPlaying],
                        playInfo: {
                            vid: this.vidPlaying + 1 ,
                            of: this.vids.length
                        }
                    }
                })
                this.vidEl.dispatchEvent(_event)
            }, this.options.updateFrequency)
        }
    }

    pause() {
        clearInterval(this.timer)
        this.playing = false
        this.vidEl.pause()
        this.debugMsg('Paused video ')
    }

    stop() {
        clearInterval(this.timer)
        this.playing = false
        this.vidEl.pause()
        this.vidEl.currentTime = 0
        this.debugMsg('Stopped video')
    }

    vidEnded(fromAutoplay) {
        clearInterval(this.timer)
        this.playing = false
        this.debugMsg('Video ended')
        if(fromAutoplay){ this.next() }
    }

    next() {
        this.debugMsg('Next video')
        clearInterval(this.timer)
        if ((this.vidPlaying + 1) > (this.vids.length - 1)){
            switch (this.options.greaterVideoID) {
                case 'first':
                    this.vidPlaying = 0
                    break
                case 'last':
                    this.vidPlaying = this.vids.length - 1
                    break
            }
        } else {
            this.vidPlaying = this.vidPlaying + 1
        }
        const _event = new CustomEvent('newVid', {
            detail: {
                currentTime: this.vidEl.currentTime,
                duration: this.vidEl.duration,
                title: this.titles[this.vidPlaying],
                playInfo: {
                    vid: this.vidPlaying + 1 ,
                    of: this.vids.length
                }
            }
        })
        this.vidEl.dispatchEvent(_event)
        this.play()
    }

    prev() {
        this.debugMsg('Previous Video')
        clearInterval(this.timer)
        if((this.vidPlaying - 1) < 0){
            switch (this.options.smallerVideoID) {
                case 'first':
                    this.vidPlaying = 0
                    break
                case 'last':
                    this.vidPlaying = this.vids.length - 1
                    break
            }
        } else {
            this.vidPlaying = this.vidPlaying - 1
        }
        const _event = new CustomEvent('newVid', {
            detail: {
                currentTime: this.vidEl.currentTime,
                duration: this.vidEl.duration,
                title: this.titles[this.vidPlaying],
                playInfo: {
                    vid: this.vidPlaying + 1 ,
                    of: this.vids.length
                }
            }
        })
        this.vidEl.dispatchEvent(_event)
        this.play()
    }

    getTitle() {
        return this.titles[this.vidPlaying]
    }

    getVids() {
        return this.vids
    }

    getCurrentVid() {
        var _vid = this.vids[this.vidPlaying]
        var _title = this.titles[this.vidPlaying]
        return {Video: _vid, Title: _title}
    }

    getList() {
        var _data = this.readJSON(this.workingDirectory + this.listfile)
        return _data.playlists[this.list]
    }

    getLists() {
        return Object.keys(this.readJSON(this.workingDirectory + this.listfile)['playlists'])
    }

    setList(list) {
        this.list = list
        var _data = this.readJSON(this.workingDirectory + this.listfile)
        this.vids = _data.playlists[this.list].files
        this.titles = _data.playlists[this.list].titles
    }

    isPlaying() {
        return this.playing
    }

    getOptions() {
        return this.options
    }

    setOption(option, value) {
        this.options[option] = value
    }

    readJSON(file) {
        this.debugMsg("Read JSON Data from " + file)
        var _request = new XMLHttpRequest()
        _request.open("GET", file, false)
        _request.overrideMimeType("application/json")
        _request.send(null)
        this.debugMsg('JSON Data read')
        return JSON.parse(_request.responseText)
    }

    debugMsg(msg){
        if(this.options.debug) {
            console.log(msg)
        }
    }

}
