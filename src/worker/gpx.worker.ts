//@ts-nocheck
import QSA from "query-selector";
import { DOMParser } from "xmldom";

const ctx: Worker = self as any;

// Respond to message from parent thread
ctx.onmessage = async (event) => {
    const parser = new gpxParser();

    try {
        let str = event.data.string;
        str = str.replace(/>\s+</g, "><");
        str = str.replace(/gpxtpx:|gpxx:|ns3:|gpxdata:|wptx1:|ctx:/g, "");
        str = str.replace(/cadence>/g, "cad>");
        str = str.replace(/heartrate>/g, "hr>");
        str = str.replace(/<\/atemp>/g, "</temp>");
        str = str.replace(/<atemp>/g, "<temp>");

        ctx.postMessage({ data: parser.parse(str) });
    } catch (e) {
        console.log("🚀 ~ file: gpx.worker.ts ~ line 66 ~ e", e);
        ctx.postMessage({ error: e });
    }
};

export default {} as typeof Worker & (new () => Worker);

/**
 * GPX file parser
 *
 * @constructor
 */
let gpxParser = function () {
    this.xmlSource = "";
    this.metadata = {};
    this.waypoints = [];
    this.tracks = [];
    this.routes = [];
};

/**
 * Parse a gpx formatted string to a GPXParser Object
 *
 * @param {string} gpxstring - A GPX formatted String
 *
 * @return {gpxParser} A GPXParser object
 */

gpxParser.prototype.querySelectorAll = function (element, selector) {
    return QSA(selector, element);
};

gpxParser.prototype.querySelector = function (element, selector) {
    return this.querySelectorAll(element, selector)?.shift();
};

gpxParser.prototype.parse = function (gpxstring) {
    let keepThis = this;

    let domParser = new DOMParser();
    this.xmlSource = domParser.parseFromString(gpxstring, "text/xml");

    let metadata = this.querySelector(this.xmlSource, "metadata");
    if (metadata != null) {
        this.metadata.name = this.getElementValue(metadata, "name");
        this.metadata.desc = this.getElementValue(metadata, "desc");
        this.metadata.time = this.getElementValue(metadata, "time");

        let author = {};
        let authorElem = this.querySelector(this.metadata, "author");
        if (authorElem != null) {
            author.name = this.getElementValue(authorElem, "name");
            author.email = {};
            let emailElem = this.querySelector(authorElem, "email");
            if (emailElem != null) {
                author.email.id = emailElem.getAttribute("id");
                author.email.domain = emailElem.getAttribute("domain");
            }

            let link = {};
            let linkElem = this.querySelector(authorElem, "link");
            if (linkElem != null) {
                link.href = linkElem.getAttribute("href");
                link.text = this.getElementValue(linkElem, "text");
                link.type = this.getElementValue(linkElem, "type");
            }
            author.link = link;
        }
        this.metadata.author = author;

        let link = {};
        let linkElem = this.queryDirectSelector(metadata, "link");
        if (linkElem != null) {
            link.href = linkElem.getAttribute("href");
            link.text = this.getElementValue(linkElem, "text");
            link.type = this.getElementValue(linkElem, "type");
            this.metadata.link = link;
        }
    }

    var wpts = [].slice.call(this.querySelectorAll(this.xmlSource, "wpt"));
    for (let idx in wpts) {
        var wpt = wpts[idx];
        let pt = {};
        pt.name = keepThis.getElementValue(wpt, "name");
        pt.sym = keepThis.getElementValue(wpt, "sym");
        pt.lat = parseFloat(wpt.getAttribute("lat"));
        pt.lon = parseFloat(wpt.getAttribute("lon"));

        let floatValue = parseFloat(keepThis.getElementValue(wpt, "ele"));
        pt.ele = isNaN(floatValue) ? null : floatValue;

        pt.cmt = keepThis.getElementValue(wpt, "cmt");
        pt.desc = keepThis.getElementValue(wpt, "desc");

        let time = keepThis.getElementValue(wpt, "time");
        pt.time = time == null ? null : new Date(time);

        keepThis.waypoints.push(pt);
    }

    var rtes = [].slice.call(this.querySelectorAll(this.xmlSource, "rte"));
    for (let idx in rtes) {
        let rte = rtes[idx];
        let route = {};
        route.name = keepThis.getElementValue(rte, "name");
        route.cmt = keepThis.getElementValue(rte, "cmt");
        route.desc = keepThis.getElementValue(rte, "desc");
        route.src = keepThis.getElementValue(rte, "src");
        route.number = keepThis.getElementValue(rte, "number");

        let type = keepThis.queryDirectSelector(rte, "type");
        route.type = type != null ? type.innerHTML : null;

        let link = {};
        let linkElem = this.querySelector(rte, "link");
        if (linkElem != null) {
            link.href = linkElem.getAttribute("href");
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        route.link = link;

        let routepoints = [];
        var rtepts = [].slice.call(this.querySelectorAll(rte, "rtept"));

        for (let idxIn in rtepts) {
            let rtept = rtepts[idxIn];
            let pt = {};
            pt.lat = parseFloat(rtept.getAttribute("lat"));
            pt.lon = parseFloat(rtept.getAttribute("lon"));

            let floatValue = parseFloat(keepThis.getElementValue(rtept, "ele"));
            pt.ele = isNaN(floatValue) ? null : floatValue;

            let time = keepThis.getElementValue(rtept, "time");
            pt.time = time == null ? null : new Date(time);

            routepoints.push(pt);
        }

        route.distance = keepThis.calculDistance(routepoints);
        route.elevation = keepThis.calcElevation(routepoints);
        route.slopes = keepThis.calculSlope(routepoints, route.distance.cumul);
        route.points = routepoints;

        keepThis.routes.push(route);
    }

    var trks = [].slice.call(this.querySelectorAll(this.xmlSource, "trk"));
    for (let idx in trks) {
        let trk = trks[idx];
        let track = {};

        track.name = keepThis.getElementValue(trk, "name");
        track.cmt = keepThis.getElementValue(trk, "cmt");
        track.desc = keepThis.getElementValue(trk, "desc");
        track.src = keepThis.getElementValue(trk, "src");
        track.number = keepThis.getElementValue(trk, "number");

        let type = keepThis.queryDirectSelector(trk, "type");
        track.type = type != null ? type.innerHTML : null;

        let link = {};
        let linkElem = this.querySelector(trk, "link");
        if (linkElem != null) {
            link.href = linkElem.getAttribute("href");
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        track.link = link;

        let trackpoints = [];
        let trkpts = [].slice.call(this.querySelectorAll(trk, "trkpt"));
        const flags = {
            cad: false,
            ele: false,
            hr: false,
            temp: false,
            time: false
        };
        for (let idxIn in trkpts) {
            var trkpt = trkpts[idxIn];
            let pt = {};
            pt.lat = parseFloat(trkpt.getAttribute("lat"));
            pt.lon = parseFloat(trkpt.getAttribute("lon"));
            pt.lng = pt.lon;

            let floatValue = parseFloat(keepThis.getElementValue(trkpt, "ele"));
            pt.ele = isNaN(floatValue) ? null : floatValue;
            flags.ele = pt.ele !== null;

            let time = keepThis.getElementValue(trkpt, "time");
            pt.time = time == null ? null : new Date(time);
            flags.time = pt.time !== null;

            let extensions = keepThis.querySelector(trkpt, "extensions");
            const trkptext = this.querySelector(
                extensions,
                "TrackPointExtension"
            );

            pt.extensions = null;
            if (trkptext) {
                let exts = Array.from(trkptext.childNodes);
                exts = exts.reduce((acc, node) => {
                    const content = isNaN(Number(node.textContent))
                        ? node.textContent
                        : Number(node.textContent);
                    acc[node.tagName] = content;
                    return acc;
                }, {});
                pt.extensions = exts;
                if (!(pt.extensions && "speed" in pt.extensions)) {
                    if (idxIn == trkpts.length - 1) {
                        pt.extensions.speed =
                            trkpts[idxIn - 1].extensions.speed;
                    } else {
                        const time =
                            new Date(trkpts[idxIn + 1]) - new Date(pt.time);
                        const dist = keepThis.calcDistanceBetween(
                            pt,
                            trkpts[idxIn + 1]
                        );

                        pt.extensions.speed = dist / time;
                    }
                }
                if (pt.extensions.cad) {
                    flags.cad = true;
                }
                if (pt.extensions.temp) {
                    flags.temp = true;
                }
            }
            const hr = keepThis.getElementValue(trkpt, "hr");
            pt.hr = hr == null ? null : Number(hr);
            flags.hr = pt.hr !== null;

            trackpoints.push(pt);
        }
        track.distance = keepThis.calculDistance(trackpoints);
        track.elevation = keepThis.calcElevation(trackpoints);
        track.slopes = keepThis.calculSlope(trackpoints, track.distance.cumul);
        track.points = trackpoints;

        track.flags = flags;
        track.maps = {};

        const speed = {
            raw: trackpoints.map((pt) => pt.extensions.speed),
            data: trackpoints.map((pt) => [pt.lat, pt.lon, pt.extensions.speed])
        };
        speed.min = Math.min(...speed.raw);
        speed.max = Math.max(...speed.raw);
        speed.average = speed.raw.reduce((a, c) => a + c, 0) / speed.raw.length;

        track.maps.speed = speed;

        if (flags.cad) {
            const points = trackpoints.filter(
                (pt) => !isNaN(pt.extensions.cad)
            );
            const cad = {
                raw: points.map((pt) => pt.extensions.cad),
                data: points.map((pt) => [pt.lat, pt.lon, pt.extensions.cad])
            };
            cad.min = Math.min(...cad.raw);
            cad.max = Math.max(...cad.raw);
            cad.average = cad.raw.reduce((a, c) => a + c, 0) / cad.raw.length;

            track.maps.cad = cad;
        }
        if (flags.ele) {
            const points = trackpoints.filter((pt) => !isNaN(pt.ele));
            const ele = {
                raw: points.map((pt) => pt.ele),
                data: points.map((pt) => [pt.lat, pt.lon, pt.ele])
            };
            ele.min = Math.min(...ele.raw);
            ele.max = Math.max(...ele.raw);
            ele.average = ele.raw.reduce((a, c) => a + c, 0) / ele.raw.length;

            track.maps.ele = ele;
        }
        if (flags.hr) {
            const points = trackpoints.filter((pt) => !isNaN(pt.hr));
            const hr = {
                raw: points.map((pt) => pt.hr),
                data: points.map((pt) => [pt.lat, pt.lon, pt.hr])
            };
            hr.min = Math.min(...hr.raw);
            hr.max = Math.max(...hr.raw);
            hr.average = hr.raw.reduce((a, c) => a + c, 0) / hr.raw.length;

            track.maps.hr = hr;
        }

        track.flags = {
            speed: true,
            ...flags
        };

        keepThis.tracks.push(track);
    }

    return {
        metadata: this.metadata,
        waypoints: this.waypoints,
        tracks: this.tracks,
        routes: this.routes
    };
};

/**
 * Get value from a XML DOM element
 *
 * @param  {Element} parent - Parent DOM Element
 * @param  {string} needle - Name of the searched element
 *
 * @return {} The element value
 */
gpxParser.prototype.getElementValue = function (parent, needle) {
    let elem = this.querySelector(parent, needle);
    if (elem != null) {
        return elem.innerHTML != undefined
            ? elem.innerHTML
            : elem.childNodes[0].data;
    }
    return elem;
};

/**
 * Search the value of a direct child XML DOM element
 *
 * @param  {Element} parent - Parent DOM Element
 * @param  {string} needle - Name of the searched element
 *
 * @return {} The element value
 */
gpxParser.prototype.queryDirectSelector = function (parent, needle) {
    let elements = this.querySelectorAll(parent, needle);
    let finalElem = elements[0];

    if (elements.length > 1) {
        let directChilds = parent.childNodes;

        for (idx in directChilds) {
            elem = directChilds[idx];
            if (elem.tagName === needle) {
                finalElem = elem;
            }
        }
    }

    return finalElem;
};

/**
 * Calcul the Distance Object from an array of points
 *
 * @param  {} points - An array of points with lat and lon properties
 *
 * @return {DistanceObject} An object with total distance and Cumulative distances
 */
gpxParser.prototype.calculDistance = function (points) {
    let distance = {};
    let totalDistance = 0;
    let cumulDistance = [];
    for (var i = 0; i < points.length - 1; i++) {
        totalDistance += this.calcDistanceBetween(points[i], points[i + 1]);
        cumulDistance[i] = totalDistance;
    }
    cumulDistance[points.length - 1] = totalDistance;

    distance.total = totalDistance;
    distance.cumul = cumulDistance;

    return distance;
};

/**
 * Calcul Distance between two points with lat and lon
 *
 * @param  {} wpt1 - A geographic point with lat and lon properties
 * @param  {} wpt2 - A geographic point with lat and lon properties
 *
 * @returns {float} The distance between the two points
 */
gpxParser.prototype.calcDistanceBetween = function (wpt1, wpt2) {
    let latlng1 = {};
    latlng1.lat = wpt1.lat;
    latlng1.lon = wpt1.lon;
    let latlng2 = {};
    latlng2.lat = wpt2.lat;
    latlng2.lon = wpt2.lon;
    var rad = Math.PI / 180,
        lat1 = latlng1.lat * rad,
        lat2 = latlng2.lat * rad,
        sinDLat = Math.sin(((latlng2.lat - latlng1.lat) * rad) / 2),
        sinDLon = Math.sin(((latlng2.lon - latlng1.lon) * rad) / 2),
        a =
            sinDLat * sinDLat +
            Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
};

/**
 * Generate Elevation Object from an array of points
 *
 * @param  {} points - An array of points with ele property
 *
 * @returns {ElevationObject} An object with negative and positive height difference and average, max and min altitude data
 */
gpxParser.prototype.calcElevation = function (points) {
    var dp = 0,
        dm = 0,
        ret = {};

    for (var i = 0; i < points.length - 1; i++) {
        let rawNextElevation = points[i + 1].ele;
        let rawElevation = points[i].ele;

        if (rawNextElevation !== null && rawElevation !== null) {
            let diff = parseFloat(rawNextElevation) - parseFloat(rawElevation);

            if (diff < 0) {
                dm += diff;
            } else if (diff > 0) {
                dp += diff;
            }
        }
    }

    var elevation = [];
    var sum = 0;

    for (var i = 0, len = points.length; i < len; i++) {
        let rawElevation = points[i].ele;

        if (rawElevation !== null) {
            var ele = parseFloat(points[i].ele);
            elevation.push(ele);
            sum += ele;
        }
    }

    ret.max = Math.max.apply(null, elevation) || null;
    ret.min = Math.min.apply(null, elevation) || null;
    ret.pos = Math.abs(dp) || null;
    ret.neg = Math.abs(dm) || null;
    ret.avg = sum / elevation.length || null;

    return ret;
};

/**
 * Generate slopes Object from an array of Points and an array of Cumulative distance
 *
 * @param  {} points - An array of points with ele property
 * @param  {} cumul - An array of cumulative distance
 *
 * @returns {SlopeObject} An array of slopes
 */
gpxParser.prototype.calculSlope = function (points, cumul) {
    let slopes = [];

    for (var i = 0; i < points.length - 1; i++) {
        let point = points[i];
        let nextPoint = points[i + 1];
        let elevationDiff = nextPoint.ele - point.ele;
        let distance = cumul[i + 1] - cumul[i];

        let slope = (elevationDiff * 100) / distance;
        slopes.push(slope);
    }

    return slopes;
};

/**
 * Export the GPX object to a GeoJSON formatted Object
 *
 * @returns {} a GeoJSON formatted Object
 */
gpxParser.prototype.toGeoJSON = function () {
    var GeoJSON = {
        type: "FeatureCollection",
        features: [],
        properties: {
            name: this.metadata.name,
            desc: this.metadata.desc,
            time: this.metadata.time,
            author: this.metadata.author,
            link: this.metadata.link
        }
    };

    for (idx in this.tracks) {
        let track = this.tracks[idx];

        var feature = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: []
            },
            properties: {}
        };

        feature.properties.name = track.name;
        feature.properties.cmt = track.cmt;
        feature.properties.desc = track.desc;
        feature.properties.src = track.src;
        feature.properties.number = track.number;
        feature.properties.link = track.link;
        feature.properties.type = track.type;

        for (idx in track.points) {
            let pt = track.points[idx];

            var geoPt = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        }

        GeoJSON.features.push(feature);
    }

    for (idx in this.routes) {
        let track = this.routes[idx];

        var feature = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: []
            },
            properties: {}
        };

        feature.properties.name = track.name;
        feature.properties.cmt = track.cmt;
        feature.properties.desc = track.desc;
        feature.properties.src = track.src;
        feature.properties.number = track.number;
        feature.properties.link = track.link;
        feature.properties.type = track.type;

        for (idx in track.points) {
            let pt = track.points[idx];

            var geoPt = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        }

        GeoJSON.features.push(feature);
    }

    for (idx in this.waypoints) {
        let pt = this.waypoints[idx];

        var feature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: []
            },
            properties: {}
        };

        feature.properties.name = pt.name;
        feature.properties.sym = pt.sym;
        feature.properties.cmt = pt.cmt;
        feature.properties.desc = pt.desc;

        feature.geometry.coordinates = [pt.lon, pt.lat, pt.ele];

        GeoJSON.features.push(feature);
    }

    return GeoJSON;
};
