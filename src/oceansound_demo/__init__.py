#!/usr/bin/env python

import base64

#import numpy as np

from OceanSound.extract import extract_series
from OceanSound.sounds import get_music

from flask import Flask, render_template, request, json, Response

app = Flask(__name__)


def replace_nan(value):
    """
    Replace NaN with None, for JSON encoding.

    """
    if isinstance(value, list):
        return map(replace_nan, value)
    elif value != value:
        return None
    else:
        return value


def gen_music(lat, lon):
#    tide = np.array(
#        [0.816, 0.785, 0.854, 0.869, 0.846, 0.855, 0.815, 0.801, 0.842, 0.864, 0.882, 0.900, 0.885, 0.859, 0.913, 0.901, 0.911, 0.891, 0.909, 0.885, 0.868, 0.836, 0.846, 0.910, 0.949, 0.943, 0.964, 0.964, 0.993, 1.021, 1.052, 1.087, 1.103, 1.094, 1.107, 1.134, 1.172, 1.191, 1.199, 1.204, 1.171, 1.157, 1.110, 1.140, 1.114, 1.149, 1.147, 1.108, 1.078, 1.072, 1.059, 1.074, 1.096, 1.125, 1.089, 1.100, 1.117, 1.079, 1.086, 1.068, 1.018, 1.016, 0.987, 0.970, 0.941, 0.962, 0.956, 0.988, 1.006, 0.968, 0.941, 0.940, 0.941, 0.891, 0.893, 0.836, 0.841, 0.868, 0.870, 0.847, 0.774, 0.684, 0.685, 0.647, 0.672, 0.691, 0.643, 0.588, 0.583, 0.596, 0.613, 0.682, 0.680, 0.697, 0.713, 0.699, 0.693, 0.787, 0.768, 0.772, 0.807, 0.854, 0.813, 0.889, 0.933, 0.974, 1.037, 1.083, 1.051, 1.051, 1.075, 1.048, 1.106, 1.135, 1.094, 1.078, 1.100, 1.139, 1.139, 1.103])

#    data_am = np.double(tide)
#    am = get_music(data_am)

#    return am, lat, lon

    data_am = extract_series(lat, lon, "/home/luizirber/temp/MODIS_Chla_9km")
    am = get_music(data_am['Series'])

    return am, data_am['Series'], data_am['Lat'], data_am['Lon']


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/music', methods=['GET', 'POST'])
def music():
    if request.method == 'GET':
        lat = float(request.args['lat'])
        lon = float(request.args['lon'])
        music, series, new_lat, new_lon = gen_music(lat, lon)
        return json.dumps({
             'lat': new_lat,
             'lon': new_lon,
             'series': replace_nan(series.tolist()),
             'music': base64.b64encode(music.getvalue()),
             }, allow_nan=False)
    elif (request.method == 'POST' and
          request.headers['Content-Type'] == 'application/json'):
        return json.dumps(request.json)
    else:
        return Response("", status=415)


def main():
    app.run(debug=True, host='0.0.0.0')


if __name__ == '__main__':
    main()
