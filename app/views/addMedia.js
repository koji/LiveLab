// @todo: how to select no media
const html = require('choo/html')
const Video = require('./components_new/VideoObj.js')
const Component = require('choo/component')
const input = require('./components/input.js')
const enumerateDevices = require('enumerate-devices')
const AudioVis = require('./components_new/audioVis.js')
// const OldVideo = require('./components/funvideocontainer.js')


const dropdown = (options, selected) => html `
  ${options.map((opt) => html`
    <option class="dark-gray" value=${opt.value} ${opt.value === selected? 'selected':''}>${opt.label}</option>
  `)}
`

const toggle = (val, onChange) => html `
  <input type="checkbox" checked=${val} onchange=${onChange} />
`

const expandable = (isOpen, content, maxHeight = '300px') => html `
  <div class="overflow-hidden" style="transition: max-height 1s;max-height:${isOpen?maxHeight:0}">
    ${content}
  </div>
`
const constraintNames = {
  'echoCancellation': 'echo cancellation',
  'autoGainControl': 'auto gain',
  'noiseSuppression': 'noise suppression'
}

module.exports = class AddMedia extends Component {
  constructor(opts) {
    super(opts)
    this.previewVideo = null
    this.onSave = opts.onSave
    this.onClose = opts.onClose
    this.previewVideo = new Video()
    this.isOpen = false
    this.audioVis = new AudioVis()
    this.devices = {
      audio: [],
      video: []
    }
    this.selectedDevices = {
      audio: {
        label: 'initial',
        deviceId: ''
      },
      video: {
        label: 'initial',
        deviceId: ''
      }
    }
    this.tracks = {
      audio: null,
      video: null
    }
    this.trackInfo = {
      audio: {},
      video: {}
    }
    this.streams = {
      audio: null,
      video: null
    }
    this.isActive = {
      audio: false,
      video: false
    }
    // this.stream = null
    this.label = ''
    this.trackInfo = {
      audio: {},
      video: {}
    }
    this.constraints = {
      audio: {
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true
      },
      video: {
        width: 1920,
        height: 1080,
        frameRate: 30
      }
    }

    this.updateDeviceList(() => {
      if (this.devices.audio.length > 0) {
        this.selectedDevices.audio = this.devices.audio[this.devices.audio.length - 1]
        //  this.getMedia('audio')
      }
      if (this.devices.video.length > 0) {
        this.selectedDevices.video = this.devices.video[this.devices.video.length - 1]
        //  this.getMedia('video')
      }
    })
    // enumerateDevices().then((devices) => {
    //   this.devices.audio = devices.filter((elem) => elem.kind == 'audioinput')
    //   this.devices.video = devices.filter((elem) => elem.kind == 'videoinput')
    //   this.devices.audio.push({label: 'no audio', deviceId: 'false'})
    //   this.devices.video.push({label: 'no video', deviceId: 'false'})
    //   if(this.devices.audio.length > 0) {
    //     this.selectedDevices.audio = this.devices.audio[this.devices.audio.length - 1]
    //   //  this.getMedia('audio')
    //   }
    //   if(this.devices.video.length > 0) {
    //     this.selectedDevices.video = this.devices.video[this.devices.video.length - 1]
    //   //  this.getMedia('video')
    //   }
    // //  this.rerender()
    // }).catch((err) =>this.log('error', err))
  }

  updateDeviceList(callback) {
    enumerateDevices().then((devices) => {
      this.devices.audio = devices.filter((elem) => elem.kind == 'audioinput')
      this.devices.video = devices.filter((elem) => elem.kind == 'videoinput')
      this.devices.audio.push({
        label: 'no audio',
        deviceId: 'false'
      })
      this.devices.video.push({
        label: 'no video',
        deviceId: 'false'
      })
      callback()
      //  this.rerender()
    }).catch((err) => this.log('error', err))
  }

  log(type, message) {
    console[type](message)
  }

  update(opts) {
    if (opts && opts.isActive) {
      //this.tracks = opts.tracks
      this.selectedDevices = Object.assign({}, this.selectedDevices, opts.selectedDevices)
      if (opts.isActive != this.isActive) {
        console.log('REREMDERING', opts.isActive, this.isActive)
        this.isActive = Object.assign({}, this.isActive, opts.isActive)
        // @ todo: only update if new information
        if (opts.isActive.video && opts.isActive.video !== this.isActive.video) this.getMedia('video')
        if (opts.isActive.audio && opts.isActive.audio !== this.isActive.audio) this.getMedia('audio')
        //   this.getMedia('audio')
        //   this.getMedia('video')
      }
    }
    return false
  }

  load(el) {
    //  console.log('loaded', opts)
    this.updateDeviceList(() => {
      this.selectedDevices = Object.assign({}, this.selectedDevices, this.parentOpts.selectedDevices)
      this.isActive = Object.assign({}, this.isActive, this.parentOpts.isActive)
      this.getMedia('audio')
      this.getMedia('video')
    })
  }

  applyConstraints(kind, obj = {}) {
    this.constraints[kind] = Object.assign({}, this.constraints[kind], obj)
    console.log(`%c applying ${kind} constraints `, 'background: #ff9900; color: #fff', this.constraints[kind])
    this.tracks[kind].applyConstraints(this.constraints[kind])
    this.trackInfo[kind] = this.tracks[kind].getSettings()
    this.rerender()
  }

  /* Inconsistent behavior between audio and video for applying constraints.
  For video, appears to work better to apply constraints once stream is received.
  For audio, seems to work better to apply constraints when get user media is called */
  getMedia(kind) {
    let initialConstraints = {
      audio: false,
      video: false
    }
    if (this.isActive[kind]) {
      initialConstraints[kind] = {
        deviceId: this.selectedDevices[kind].deviceId
      }
      if (kind === 'audio') {
        initialConstraints[kind] = Object.assign({}, initialConstraints[kind], this.constraints[kind])
      }
      navigator.mediaDevices.getUserMedia(initialConstraints)
        .then((stream) => {
          this.tracks[kind] = stream.getTracks().filter((track) => track.kind == kind)[0]
          this.streams[kind] = stream
          window.stream = stream
          console.log(`%c got user media (${kind})`, 'background: #0044ff; color: #f00', stream.getTracks(), this.tracks)
          this.applyConstraints(kind)
        }).catch((err) => {
          this.log('error', err)
        })
    } else {
      this.tracks[kind] = null
      this.streams[kind] = null
      this.rerender()
    }
  }

  createElement(opts) {
    this.parentOpts = opts
    var self = this
    const dropdowns = ['audio', 'video'].map((kind) => html `<select name=${kind} class="w-100 pa2 white ttu ba b--white pointer" style="background:none" onchange=${(e)=>{
      this.selectedDevices[kind] = this.devices[kind].filter((device) => device.deviceId === e.target.value)[0]
      if(this.selectedDevices[kind].deviceId === 'false') {
        this.isActive[kind] = false
      } else {
        this.isActive[kind] = true
      }
      this.getMedia(kind)
    }}>
    ${dropdown(
      this.devices[kind].map((device, index) => (  { value: device.deviceId,  label: device.label })),
      this.selectedDevices[kind].deviceId
    )}
    </select>`)

    let vid = this.previewVideo.render(this.streams.video, {
      objectPosition: 'center'
    })

    var audioSettings = Object.keys(this.constraints.audio).map((constraint) =>
      html `<div class="flex w-100 justify-between">
    <div class="">${constraintNames[constraint]}</div>
    <input type="checkbox" id=${constraint} name=${constraint} checked=${this.constraints.audio[constraint]}
    onchange=${(e) => {
      this.constraints.audio[constraint] = e.target.checked
      this.getMedia('audio')
    }}>
    </div>`
    )
    // class="pa2 ba b--white white w-100" style="background:none"
    //  onkeypress=${(e) => {
    //   console.log('applying', e.srcElement.value, constraint)
    //   if(parseInt(e.srcElement.value)) { this.applyConstraints('video', { [constraint]: parseInt(e.srcElement.value) })}}
    // }}
    var videoSettings = Object.keys(this.constraints.video).map((constraint) => html `
  <div class="flex-auto w3 mt2">
  <div>${constraint === 'frameRate' ? 'fps': constraint}</div>
  <input type="text" value=${this.constraints.video[constraint]} class="pa2 ba b--white white w-100 bg-none" onkeyup=${(e) => {
    if(parseInt(e.srcElement.value)) { this.applyConstraints('video', { [constraint]: parseInt(e.srcElement.value) }) }
  }}> </input>
  </div>`)

    let vidInfo = this.trackInfo.video.width ? `${this.trackInfo.video.width}x${this.trackInfo.video.height}@${this.trackInfo.video.frameRate}fps` : ''

    return html `
  <div class="h-100 flex flex-column center overflow-y-auto ttu lh-title pa1 pa2-ns b">
    <div class="flex flex-column mw6 w-100">

    <!-- video settings -->
    <div class="flex flex-column mw6 w-100 mt0">
    <div class="livelab-yellow">Video input</div>
    <div>${dropdowns[1]}</div>
    ${expandable(this.isActive.video, html`
      <div class="mt4 flex justify-between"><div>Video preview</div></div>
      <div class="w-100 h4 h5-ns ba b--white">${vid}</div>
      <div><p>Current Video Resolution: ${vidInfo}</p></div>
      <div class="flex flex-wrap mt4">${videoSettings} </div>`, '500px'
    )}

    <!--audio settings -->
    <div class="mt4 livelab-yellow" >Audio input</div>
    <div>${dropdowns[0]}</div>
      ${expandable(this.isActive.audio,
        html`<div class="mt4">Audio meter</div>
          <div class="ba b--white">${this.audioVis.render(this.streams.audio, this.isOpen)}</div>
          <div class="mt3 flex flex-column">
            <div class="flex flex-wrap">${audioSettings}</div>
          </div>`)}
    </div>

   <!--signalling server -->
   <div class = "mt4 ttu">
   <p class="f5 livelab-yellow">Signaling Server</p>
   <div class="flex flex-wrap">
    <section class="f6 link dim ph3 pv2 mr2 livelab-gray bg-livelab-yellow pointer"> Default </section>
    <!--onclick: remove class: livelab-gray, bg-livelab-yellow | add class: white, ba b--white, bg-none -->
    <section class="f6 link dim ph3 pv2 mr2 white ba b--white bg-none pointer"> Customize</section>
    <!--onclick: remove class: white, ba b--white bg-none | add class: livelab-gray bg-livelab-yellow-->
   </div>
   </div>

  <!--buttons go here-->
    <div class="flex flex-wrap mt4">
      ${this.isActive.audio || this.isActive.video ? html`
      <div class="f6 link dim ph3 pv2 mr2 livelab-gray bg-livelab-yellow pointer" onclick=${() => {
           var tracks = Object.values(this.tracks).filter((track) => track !== null)
          // emit('user:addStream', new MediaStream(tracks), this.label)
          // emit('layout:toggleMenuItem', 'addMedia', 'panels')
           opts.onSave({stream: new MediaStream(tracks), mediaObj: this})
        }}>${opts.saveText}</div>
      ` :''}
      <div class="f6 link dim ph3 pv2 livelab-gray bg-white pointer" onclick=${opts.onCancel}>Cancel</div>
    </div>
    </div>
  </div>`
  }
}