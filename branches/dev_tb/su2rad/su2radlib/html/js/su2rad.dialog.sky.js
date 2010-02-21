
var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()

su2rad.dialog.sky = su2rad.dialog.sky ? su2rad.dialog.sky : new Object()

su2rad.dialog.sky.controllers = new Array()
su2rad.dialog.sky._controllerHash = new Object()

su2rad.dialog.sky.addController = function (cObj) {
    this.controllers.push(cObj.name)
    this._controllerHash[cObj.name] = cObj
    if (this.controllers.length == 1) {
        log.info("setting controller '" + cObj.name + "'")
        this.controller = cObj
        //this.controller.updateDialog()
    }
}

su2rad.dialog.sky.update = function () {
    var container = document.getElementById("skyGeneratorSelection")
    while (container.hasChildNodes() == true) {
        container.removeChild(container.firstChild)
    }
    this.createGeneratorControl(container)
    this.controller.update()
    //XXX apply?
}

su2rad.dialog.sky.createGeneratorControl = function (container) {
    var span = document.createElement("SPAN")
    span.className = "gridLabel"
    span.appendChild(document.createTextNode("generator:"))
    container.appendChild(span)
    var select = document.createElement("SELECT")
    select.id = "skyGenerator"
    select.onchange = function () { su2rad.dialog.sky.setGenerator(this.value) }

    for (var i=0; i< this.controllers.length; i++) {
        var gName = this.controllers[i]
        var gObj = this._controllerHash[gName]
        var selected = false
        if (gObj == this.controller) {
            selected = true
        }
        var gOpt = new Option(gName, gName, selected, selected)
        try {
            select.add(gOpt, null)
        } catch (e) {
            select.add(gOpt)
        }
    }
    container.appendChild(select)
}

su2rad.dialog.sky.hasGenerator = function (gName) {
    return this._controllerHash[gName] 
}

su2rad.dialog.sky.setGenerator = function (gName) {
    if (this._controllerHash[gName]) {
        su2rad.settings.sky.setGenerator(gName)
        this.controller = this._controllerHash[gName]
        this.controller.update()
        applySkySettings();
    } else {
        log.error("gName '" + gName + "' does not exist")
        setSelectionValue('skyGenerator', this.controller.name);
    }
}

su2rad.dialog.sky.addController(new SkyControllerGensky())
su2rad.dialog.sky.addController(new SkyControllerGendaylit())
su2rad.dialog.sky.addController(new SkyControllerClimateData())
su2rad.dialog.sky.addController(new SkyController())

